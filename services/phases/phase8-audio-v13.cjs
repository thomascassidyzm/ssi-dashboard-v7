/**
 * Phase 8: Audio Generation Service (v13)
 *
 * IMPORTANT: DATABASE-ONLY ARCHITECTURE (January 2026)
 * =====================================================
 * This service reads course data from Supabase and writes audio records
 * directly to the course_audio table (flat, course-owned).
 *
 * Data Sources (all from Supabase):
 * - courses: Course metadata and voice configuration
 * - course_legos: LEGO definitions to generate audio for
 * - course_practice_phrases: Practice phrases to generate audio for
 *
 * JSON files are NOT read. Audio metadata is written to Supabase.
 * Audio files are stored in S3 (ssi-audio-stage bucket).
 *
 * @version 13.0.0
 * @port 3465
 */

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const { bumpCourseVersion } = require('../shared/course-version.cjs')
const { normalizeForAudio } = require('../shared/text-normalize.cjs')
const createLogger = require('../shared/logger.cjs')
const ttsService = require('../tts-service.cjs')
const { toBcp47 } = require('../voice-discovery-service.cjs')
const audioProcessor = require('../audio-processor.cjs')
const genderService = require('../gender-expansion-service.cjs')
const genderHaikuService = require('../gender-haiku-service.cjs')

const { claudeChat } = require('../shared/claude-cli.cjs')
const { emitProgress } = require('../shared/emit-progress.cjs')
const logger = createLogger('Phase8-Audio-v13')
const { bulkGetRegenerationCounts } = require('../supabase-client.cjs')
const { toIso3, getName: getLangEnglishName, databaseToManifest } = require('../language-code-service.cjs')

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

/**
 * Get the effective release target for a course.
 * Rule: if a seed has been decomposed (has LEGOs), it needs audio.
 * Uses the actual max decomposed seed_number, not a configured value.
 */
async function getEffectiveReleaseTarget(courseCode, courseSeedCount) {
  const { data } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: false })
    .limit(1)
  const maxDecomposed = data?.[0]?.seed_number || 0
  // Use the higher of: actual decomposed seeds vs configured seed_count vs 260 fallback
  return Math.max(maxDecomposed, courseSeedCount || 0, 260)
}
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'

// =============================================================================
// LANGUAGE NAMES (for presentation templates)
// =============================================================================

// Get the target language name localised into the known language.
// Uses Intl.DisplayNames (488 languages via CLDR) with language-code-service fallback.
// No hardcoded maps — adding a new language Just Works.
function getLocalisedLangName(targetLang, knownLang) {
  try {
    const target2 = databaseToManifest(targetLang) // 3-letter → 2-letter for Intl API
    const known2 = databaseToManifest(knownLang)
    const dn = new Intl.DisplayNames([known2], { type: 'language' })
    const name = dn.of(target2)
    if (name && name !== target2) return name
  } catch (_) { /* fall through */ }
  // Fallback: English name from CSV
  return getLangEnglishName(targetLang)
}

// Canonical text normalization — see services/shared/text-normalize.cjs
const normalizeText = normalizeForAudio

/**
 * Get or generate presentation template for a known language.
 * Looks up presentation_templates first; if none exists, uses Haiku to
 * generate one in the known language and caches it for future use.
 *
 * @param {string} knownLang - ISO 639-3 language code for the known language
 * @returns {Promise<string>} The presentation template string
 */
async function getOrCreatePresentationTemplate(knownLang) {
  // 1. Check DB for existing template
  const { data: existing } = await supabase
    .from('presentation_templates')
    .select('template')
    .eq('known_lang', knownLang)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(1)

  if (existing?.[0]?.template) {
    return existing[0].template
  }

  // 2. Load example templates to show Haiku the pattern
  const { data: examples } = await supabase
    .from('presentation_templates')
    .select('known_lang, template')
    .eq('is_active', true)
    .order('known_lang')

  const knownLangName = getLocalisedLangName(knownLang, 'eng')

  const exampleBlock = (examples || [])
    .map(e => `${e.known_lang}: ${e.template}`)
    .join('\n')

  const prompt = `You are a translation expert. Generate a presentation template for introducing language LEGOs (vocabulary items) to learners whose known language is ${knownLangName} (${knownLang}).

The template MUST be written entirely in ${knownLangName}. It introduces a target language word/phrase to the learner.

It must contain exactly these three placeholders (keep them as-is, do not translate them):
- {target_lang_name} — will be replaced with the name of the target language in ${knownLangName}
- {known} — will be replaced with the word/phrase in the learner's known language
- {seed} — will be replaced with a context sentence in the learner's known language

Here are working examples in other languages:
${exampleBlock}

The pattern is: "[target_lang_name] [for] — '{known}' — [as in] — '{seed}' — [is]:"
Translate this pattern naturally into ${knownLangName}. Use appropriate punctuation for ${knownLangName}.

Reply with ONLY the template string, nothing else.`

  logger.info(`Generating presentation template for ${knownLang} (${knownLangName}) via Haiku...`)
  const template = await claudeChat(prompt, { model: 'haiku', timeout: 30000 })

  // Validate it contains all required placeholders
  if (!template.includes('{target_lang_name}') || !template.includes('{known}') || !template.includes('{seed}')) {
    logger.error(`Generated template for ${knownLang} is missing placeholders: "${template}"`)
    // Fall back to a simple universal pattern
    const fallback = `{target_lang_name} — '{known}' — '{seed}' —:`
    logger.warn(`Using minimal fallback template for ${knownLang}`)
    return fallback
  }

  // 3. Cache in DB for future use
  const { error: insertError } = await supabase
    .from('presentation_templates')
    .insert({
      template: template.trim(),
      known_lang: knownLang,
      priority: 5, // Lower than hand-verified (10)
      is_active: true
    })

  if (insertError) {
    logger.warn(`Failed to cache template for ${knownLang}: ${insertError.message}`)
  } else {
    logger.info(`Cached new presentation template for ${knownLang}: "${template.trim()}"`)
  }

  return template.trim()
}

/**
 * Check if text is punctuation-only (TTS can't generate these)
 * Punctuation should be taught contextually as part of M-LEGOs, not standalone
 * @param {string} text - Text to check
 * @returns {boolean} True if text is empty or punctuation-only
 */
function isPunctuationOnly(text) {
  if (!text) return true
  const trimmed = text.trim()
  if (!trimmed) return true
  // Match common punctuation marks:
  // - Western: .,;:!?-()[]{}  (including inverted ¿¡)
  // - CJK: 。、？！；：…—–「」『』（）【】
  // - Arabic/RTL: ؟،؛ (U+061F, U+060C, U+061B)
  // - Hebrew: ־ (U+05BE maqaf)
  // Also treat single non-ASCII-alpha characters as ungeneratable
  // (e.g. CJK particles 儿, の, が used as component known_text with no English translation)
  if (trimmed.length === 1 && !/[a-zA-Z0-9]/.test(trimmed)) return true
  return /^[.,;:!?¿¡。、？！；：…—–\-()[\]{}「」『』（）【】؟،؛־]+$/.test(trimmed)
}

// =============================================================================
// CONCURRENCY SETTINGS
// =============================================================================

// Azure TTS S0 (Standard) tier limits:
// - 200 transactions per second (TPS)
// - 20 concurrent connections max
// Default 20 = max concurrency for paid tier
const CONCURRENCY = parseInt(process.env.AUDIO_CONCURRENCY, 10) || 20

/**
 * Fetch ALL existing audio for a course from course_audio.
 * Avoids pagination entirely — uses a single query with high limit.
 * Supabase PostgREST supports up to ~100k rows per request with select.
 * We deduplicate into a Set anyway, so even if Supabase returns some overlap, it's fine.
 * @param {string} courseCode
 * @returns {Set} Set of "normalizedText|language|role" keys for existing audio
 */
async function getExistingAudioSet(courseCode) {
  // Fetch in one large batch — course_audio per course is typically 10k-30k rows
  // Using .limit() avoids the 1000-row default without needing ORDER BY
  // Fetch raw `text` column so we can normalize it ourselves — text_normalized
  // may have been written by old code that stripped ?! (we now preserve them)
  const { data, error } = await supabase
    .from('course_audio')
    .select('text, language, role, s3_key')
    .eq('course_code', courseCode)
    .not('s3_key', 'like', 'pending/%')
    .limit(100000)

  if (error) throw error

  // Store both canonical AND ?!-stripped forms so lookups work either way.
  // Old audio was stored without ?! — new phrases may have them.
  // "emin misin?" and "emin misin" are the same audio file.
  const innerSet = new Set()
  for (const a of (data || [])) {
    const norm = normalizeText(a.text)
    innerSet.add(`${norm}|${a.language}|${a.role}`)
    // Also add stripped form so "emin misin" matches lookup for "emin misin?"
    const stripped = norm.replace(/[!?！？]+$/, '')
    if (stripped !== norm) innerSet.add(`${stripped}|${a.language}|${a.role}`)
  }

  // Return a Set-like object with a custom has() that checks both forms
  const existingSet = {
    has(key) {
      if (innerSet.has(key)) return true
      // Also try stripping trailing ?! from the lookup key
      const stripped = key.replace(/([!?！？]+)\|/, '|')
      return stripped !== key && innerSet.has(stripped)
    },
    get size() { return innerSet.size }
  }
  logger.info(`getExistingAudioSet(${courseCode}): ${data?.length || 0} rows, ${innerSet.size} unique keys`)
  return existingSet
}

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
  cancelled: false,     // Flag to signal cancellation
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
  currentWork.cancelled = false  // Reset cancellation flag
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

function cancelWork() {
  if (currentWork.active) {
    currentWork.cancelled = true
    logger.info(`[PROGRESS] Cancellation requested for ${currentWork.operation} on ${currentWork.courseCode}`)
    return true
  }
  return false
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
// CANCEL ENDPOINT - Stop current work
// =============================================================================

app.post('/cancel', (req, res) => {
  if (!currentWork.active) {
    return res.status(404).json({ error: 'No active job to cancel' })
  }

  const cancelled = cancelWork()
  if (cancelled) {
    res.json({
      success: true,
      message: 'Cancellation requested',
      courseCode: currentWork.courseCode,
      operation: currentWork.operation,
      progress: {
        current: currentWork.current,
        total: currentWork.total,
        success: currentWork.success,
        failed: currentWork.failed
      }
    })
  } else {
    res.status(400).json({ error: 'Failed to cancel job' })
  }
})

// Also support DELETE /cancel/:courseCode for backwards compatibility
app.delete('/cancel/:courseCode', (req, res) => {
  if (!currentWork.active) {
    return res.status(404).json({ error: 'No active job to cancel' })
  }

  if (currentWork.courseCode !== req.params.courseCode) {
    return res.status(400).json({
      error: 'Course code mismatch',
      activeJob: currentWork.courseCode,
      requested: req.params.courseCode
    })
  }

  const cancelled = cancelWork()
  if (cancelled) {
    res.json({
      success: true,
      message: 'Cancellation requested',
      courseCode: currentWork.courseCode
    })
  } else {
    res.status(400).json({ error: 'Failed to cancel job' })
  }
})

// =============================================================================
// GET PLAN - What audio is missing?
// =============================================================================

// =============================================================================
// HELPER: Link audio IDs to phrases/legos/seeds
// =============================================================================
async function linkAudioIds(courseCode) {
  // Try RPC first (single DB round-trip, handles normalization correctly)
  const { data, error } = await supabase.rpc('link_all_audio_ids', {
    p_course_code: courseCode
  })

  if (!error) {
    const presResult = await linkPresentationAudio(courseCode)
    const compPresResult = await linkComponentPresentationAudio(courseCode)
    const result = data || {}
    result.presentations = presResult.linked || 0
    result.component_presentations = compPresResult.linked || 0
    const rpcTotal = (result.phrases_known || 0) + (result.phrases_target1 || 0) + (result.phrases_target2 || 0)
      + (result.legos_known || 0) + (result.legos_target1 || 0) + (result.legos_target2 || 0)
      + (result.seeds_known || 0) + (result.seeds_target1 || 0) + (result.seeds_target2 || 0)
    result.total = rpcTotal + (result.presentations || 0) + (result.component_presentations || 0)
    logger.info(`linkAudioIds: linked via RPC for ${courseCode}`, JSON.stringify(result))
    return result
  }

  // RPC timed out — fall back to JS batch linking
  logger.warn(`link_all_audio_ids RPC failed (${error.message}), falling back to JS batch linking`)
  return await linkAudioIdsBatch(courseCode)
}

/**
 * JS fallback for linking audio IDs when the SQL RPC times out on large courses.
 * Loads the audio map, then batch-updates each table's NULL audio_id columns.
 * Uses text_normalized from course_audio (written by SQL normalize_text) for matching.
 */
async function linkAudioIdsBatch(courseCode) {
  const result = { total: 0 }
  const PAGE_SIZE = 1000
  const BATCH = 200

  // Load audio map: "text_normalized|language|role" → course_audio.id
  const { data: audioRows, error: audioErr } = await supabase
    .from('course_audio')
    .select('id, text_normalized, language, role, s3_key')
    .eq('course_code', courseCode)
    .not('s3_key', 'like', 'pending/%')
    .limit(100000)
  if (audioErr) throw new Error(`Failed to load course_audio: ${audioErr.message}`)

  const audioMap = new Map()
  for (const a of (audioRows || [])) {
    if (a.text_normalized) audioMap.set(`${a.text_normalized}|${a.language}|${a.role}`, a.id)
  }
  logger.info(`linkAudioIdsBatch: loaded ${audioMap.size} audio entries for ${courseCode}`)

  // Helper: link one slot on one table
  async function linkSlot(table, idCol, textCol, audioCol, lang, role) {
    let linked = 0
    let offset = 0
    let more = true
    while (more) {
      const { data: rows, error: err } = await supabase
        .from(table)
        .select(`${idCol}, ${textCol}`)
        .eq('course_code', courseCode)
        .is(audioCol, null)
        .order(idCol, { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
      if (err) { logger.error(`linkSlot ${table}.${audioCol}: ${err.message}`); break }
      if (!rows?.length) break

      // Collect updates
      const updates = []
      for (const row of rows) {
        const norm = normalizeForAudio(row[textCol])
        if (!norm) continue
        const key = `${norm}|${lang}|${role}`
        let audioId = audioMap.get(key)
        // DB text_normalized may strip ?! while JS normalizeForAudio preserves them — try stripped form
        if (!audioId) {
          const stripped = norm.replace(/[!?！？]+$/, '')
          if (stripped !== norm) audioId = audioMap.get(`${stripped}|${lang}|${role}`)
        }
        if (audioId) updates.push({ id: row[idCol], audioId })
      }

      // Batch update
      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH)
        for (const u of batch) {
          const { error: upErr } = await supabase
            .from(table)
            .update({ [audioCol]: u.audioId })
            .eq('course_code', courseCode)
            .eq(idCol, u.id)
          if (!upErr) linked++
        }
      }

      more = rows.length === PAGE_SIZE
      offset += PAGE_SIZE
    }
    return linked
  }

  // Get course languages
  const { data: course } = await supabase
    .from('courses')
    .select('known_lang, target_lang')
    .eq('course_code', courseCode)
    .single()
  if (!course) throw new Error(`Course not found: ${courseCode}`)
  const { known_lang, target_lang } = course

  // Link all slots across all 3 tables
  const slots = [
    ['course_practice_phrases', 'id',      'known_text',  'known_audio_id',   known_lang,  'known'],
    ['course_practice_phrases', 'id',      'target_text', 'target1_audio_id', target_lang, 'target1'],
    ['course_practice_phrases', 'id',      'target_text', 'target2_audio_id', target_lang, 'target2'],
    ['course_legos',            'lego_id', 'known_text',  'known_audio_id',   known_lang,  'known'],
    ['course_legos',            'lego_id', 'target_text', 'target1_audio_id', target_lang, 'target1'],
    ['course_legos',            'lego_id', 'target_text', 'target2_audio_id', target_lang, 'target2'],
    ['course_seeds',            'id',      'known_text',  'known_audio_id',   known_lang,  'known'],
    ['course_seeds',            'id',      'target_text', 'target1_audio_id', target_lang, 'target1'],
    ['course_seeds',            'id',      'target_text', 'target2_audio_id', target_lang, 'target2'],
  ]

  for (const [table, idCol, textCol, audioCol, lang, role] of slots) {
    const n = await linkSlot(table, idCol, textCol, audioCol, lang, role)
    const key = `${table.replace('course_', '')}_${audioCol.replace('_audio_id', '')}`
    result[key] = n
    result.total += n
    if (n > 0) logger.info(`linkAudioIdsBatch: ${key} = ${n}`)
  }

  // Presentation audio
  const presResult = await linkPresentationAudio(courseCode)
  result.presentations = presResult.linked || 0
  result.total += result.presentations

  // Component presentation audio
  const compPresResult = await linkComponentPresentationAudio(courseCode)
  result.component_presentations = compPresResult.linked || 0
  result.total += result.component_presentations

  logger.info(`linkAudioIdsBatch: total linked = ${result.total} for ${courseCode}`)
  return result
}

// =============================================================================
// HELPER: Link presentation audio to course_legos
// =============================================================================
// Belt-and-suspenders approach: matches course_audio (role=presentation, lego_id set)
// to course_legos.presentation_audio_id. Runs after any presentation generation.
// =============================================================================
async function linkPresentationAudio(courseCode) {
  // Get all presentation audio that has lego_id set (filter pending client-side)
  const { data: rawPres, error: presError } = await supabase
    .from('course_audio')
    .select('id, lego_id, s3_key')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .not('lego_id', 'is', null)
  const presentations = (rawPres || []).filter(p => !p.s3_key || !p.s3_key.startsWith('pending/'))

  if (presError || !presentations?.length) {
    return { linked: 0, error: presError?.message || null }
  }

  // Get all LEGOs missing presentation_audio_id
  const { data: legosNeedingLink } = await supabase
    .from('course_legos')
    .select('lego_id, presentation_audio_id')
    .eq('course_code', courseCode)
    .eq('is_new', true)

  if (!legosNeedingLink?.length) return { linked: 0 }

  // Build map: lego_id -> presentation course_audio.id
  const presMap = new Map()
  for (const p of presentations) {
    presMap.set(p.lego_id, p.id)
  }

  // Update LEGOs where presentation_audio_id is NULL or doesn't match
  let linked = 0
  for (const lego of legosNeedingLink) {
    const presId = presMap.get(lego.lego_id)
    if (!presId) continue
    if (lego.presentation_audio_id === presId) continue // already correct

    const legoMatch = lego.lego_id.match(/S(\d+)L(\d+)/)
    if (!legoMatch) continue

    const seedNumber = parseInt(legoMatch[1], 10)
    const legoIndex = parseInt(legoMatch[2], 10)

    const { error } = await supabase
      .from('course_legos')
      .update({ presentation_audio_id: presId })
      .eq('course_code', courseCode)
      .eq('seed_number', seedNumber)
      .eq('lego_index', legoIndex)

    if (!error) linked++
  }

  if (linked > 0) {
    logger.info(`linkPresentationAudio: linked ${linked} presentation audio IDs for ${courseCode}`)
  }

  return { linked }
}

/**
 * Link presentation audio IDs to component phrases (course_practice_phrases).
 * Component presentation audio is matched by text_normalized + role.
 * This mirrors linkPresentationAudio but for components instead of LEGOs.
 */
async function linkComponentPresentationAudio(courseCode) {
  // 1. Get component phrases missing presentation_audio_id
  const PAGE_SIZE = 1000
  const components = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text')
      .eq('course_code', courseCode)
      .eq('phrase_role', 'component')
      .is('presentation_audio_id', null)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error || !data?.length) break
    components.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  if (components.length === 0) return { linked: 0 }

  // 2. Get course info and presentation template
  const { data: course } = await supabase
    .from('courses')
    .select('known_lang, target_lang')
    .eq('course_code', courseCode)
    .single()
  if (!course) return { linked: 0 }

  const targetLangName = getLocalisedLangName(course.target_lang, course.known_lang)
  const template = await getOrCreatePresentationTemplate(course.known_lang)

  // 3. Load parent M-LEGOs for "as in" context
  const seedNumbers = [...new Set(components.map(c => c.seed_number))]
  const parentMap = new Map()
  for (let i = 0; i < seedNumbers.length; i += 500) {
    const batch = seedNumbers.slice(i, i + 500)
    const { data: parents } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text')
      .eq('course_code', courseCode)
      .eq('type', 'M')
      .in('seed_number', batch)
    for (const l of (parents || [])) {
      parentMap.set(`${l.seed_number}:${l.lego_index}`, l)
    }
  }

  // 4. Build presentation text for each component and look up audio
  const { data: allPresAudio } = await supabase
    .from('course_audio')
    .select('id, text_normalized, s3_key')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .eq('language', course.known_lang)
    .not('s3_key', 'like', 'pending/%')
    .limit(100000)

  const presAudioMap = new Map()
  for (const a of (allPresAudio || [])) {
    presAudioMap.set(a.text_normalized, a.id)
  }

  // 5. Match and link
  let linked = 0
  for (const comp of components) {
    const parent = parentMap.get(`${comp.seed_number}:${comp.lego_index}`)
    if (!parent) continue

    const presText = template
      .replace('{target_lang_name}', targetLangName)
      .replace('{known}', comp.known_text)
      .replace('{seed}', parent.known_text)

    const norm = normalizeForAudio(presText)
    const audioId = presAudioMap.get(norm)
    if (!audioId) continue

    const { error } = await supabase
      .from('course_practice_phrases')
      .update({ presentation_audio_id: audioId })
      .eq('id', comp.id)

    if (!error) linked++
  }

  if (linked > 0) {
    logger.info(`linkComponentPresentationAudio: linked ${linked} component presentation audio IDs for ${courseCode}`)
  }

  return { linked }
}

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
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const releaseTarget = await getEffectiveReleaseTarget(courseCode, course.seed_count)

    // Step 1: Skip linking in plan — backfill already ran, generate endpoint links after each batch.
    // Calling link_all_audio_ids here was causing statement timeouts on large courses.

    // Step 2: Get authoritative NULL-based counts via SQL RPC
    const { data: counts, error: countsError } = await supabase.rpc('get_audio_counts', {
      p_course_code: courseCode,
      p_release_target: releaseTarget
    })
    if (countsError) throw new Error(`get_audio_counts RPC failed: ${countsError.message}`)

    const p = counts.phrases || {}
    const l = counts.legos || {}
    const s = counts.seeds || {}

    // Count un-generatable phrases (empty/punctuation text with NULL audio_id)
    // These should not be reported as "missing" — they can never have audio
    let ungeneratableKnown = 0
    let ungeneratableTarget1 = 0
    let ungeneratableTarget2 = 0
    {
      // Phrases with NULL audio_id AND empty/punctuation text
      const { data: ungeneratable } = await supabase
        .from('course_practice_phrases')
        .select('known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
        .eq('course_code', courseCode)
        .lte('seed_number', releaseTarget)
        .or('known_audio_id.is.null,target1_audio_id.is.null,target2_audio_id.is.null')
        .limit(10000)

      for (const row of (ungeneratable || [])) {
        if (row.known_audio_id === null && isPunctuationOnly(row.known_text)) ungeneratableKnown++
        if (row.target1_audio_id === null && isPunctuationOnly(row.target_text)) ungeneratableTarget1++
        if (row.target2_audio_id === null && isPunctuationOnly(row.target_text)) ungeneratableTarget2++
      }

      // Also check legos
      const { data: ungeneratableLegos } = await supabase
        .from('course_legos')
        .select('known_text, target_text, known_audio_id, target1_audio_id')
        .eq('course_code', courseCode)
        .lte('seed_number', releaseTarget)
        .or('known_audio_id.is.null,target1_audio_id.is.null')
        .limit(10000)

      for (const row of (ungeneratableLegos || [])) {
        if (row.known_audio_id === null && isPunctuationOnly(row.known_text)) ungeneratableKnown++
        if (row.target1_audio_id === null && isPunctuationOnly(row.target_text)) ungeneratableTarget1++
      }
    }

    // Missing counts from NULL audio_id columns, minus un-generatable items
    const missingKnown = Math.max(0, (p.missing_known || 0) + (l.missing_known || 0) + (s.missing_known || 0) - ungeneratableKnown)
    const missingTarget1 = Math.max(0, (p.missing_target1 || 0) + (l.missing_target1 || 0) + (s.missing_target1 || 0) - ungeneratableTarget1)
    const missingTarget2 = Math.max(0, (p.missing_target2 || 0) + (s.missing_target2 || 0) - ungeneratableTarget2)
    const missingPresentation = l.missing_presentation || 0

    // Total audio slots (also subtract un-generatable from total)
    const ungeneratableTotal = ungeneratableKnown + ungeneratableTarget1 + ungeneratableTarget2
    const totalSlots = ((p.total || 0) * 3) + ((l.total || 0) * 2) + (l.total_new || 0) + ((s.total || 0) * 3) - ungeneratableTotal
    const totalMissing = missingKnown + missingTarget1 + missingTarget2 + missingPresentation
    const totalExisting = totalSlots - totalMissing

    // Step 3: Cost estimation — still need unique text dedup for TTS cost (not correctness)
    const existingSet = await getExistingAudioSet(courseCode)
    const needed = []
    const PAGE_SIZE = 1000

    // Phrases
    let phrasesOffset = 0
    let hasMorePhrases = true
    let phraseCount = 0
    while (hasMorePhrases) {
      const { data: phrasesBatch, error: phrasesError } = await supabase
        .from('course_practice_phrases')
        .select('known_text, target_text')
        .eq('course_code', courseCode)
        .lte('seed_number', releaseTarget)
        .order('id')
        .range(phrasesOffset, phrasesOffset + PAGE_SIZE - 1)
      if (phrasesError) throw phrasesError
      for (const phrase of (phrasesBatch || [])) {
        phraseCount++
        const knownKey = `${normalizeText(phrase.known_text)}|${course.known_lang}|known`
        if (!existingSet.has(knownKey)) {
          needed.push({ text: phrase.known_text, language: course.known_lang, role: 'known' })
        }
        for (const role of ['target1', 'target2']) {
          const targetKey = `${normalizeText(phrase.target_text)}|${course.target_lang}|${role}`
          if (!existingSet.has(targetKey)) {
            needed.push({ text: phrase.target_text, language: course.target_lang, role })
          }
        }
      }
      hasMorePhrases = (phrasesBatch || []).length === PAGE_SIZE
      phrasesOffset += PAGE_SIZE
    }

    // LEGOs
    const { data: allLegos } = await supabase
      .from('course_legos')
      .select('lego_id, known_text, target_text')
      .eq('course_code', courseCode)
      .lte('seed_number', releaseTarget)
    for (const lego of (allLegos || [])) {
      const knownKey = `${normalizeText(lego.known_text)}|${course.known_lang}|known`
      if (!existingSet.has(knownKey)) {
        needed.push({ text: lego.known_text, language: course.known_lang, role: 'known' })
      }
      for (const role of ['target1', 'target2']) {
        const targetKey = `${normalizeText(lego.target_text)}|${course.target_lang}|${role}`
        if (!existingSet.has(targetKey)) {
          needed.push({ text: lego.target_text, language: course.target_lang, role })
        }
      }
    }

    // Seeds
    const { data: allSeeds } = await supabase
      .from('course_seeds')
      .select('known_text, target_text')
      .eq('course_code', courseCode)
      .eq('status', 'released')
      .lte('seed_number', releaseTarget)
    for (const seed of (allSeeds || [])) {
      const knownKey = `${normalizeText(seed.known_text)}|${course.known_lang}|known`
      if (!existingSet.has(knownKey)) {
        needed.push({ text: seed.known_text, language: course.known_lang, role: 'known' })
      }
      for (const role of ['target1', 'target2']) {
        const targetKey = `${normalizeText(seed.target_text)}|${course.target_lang}|${role}`
        if (!existingSet.has(targetKey)) {
          needed.push({ text: seed.target_text, language: course.target_lang, role })
        }
      }
    }

    // Presentation audio (still text-dedup for cost)
    const { data: newLegos } = await supabase
      .from('course_legos')
      .select('lego_id, known_text, presentation_audio_id')
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .lte('seed_number', releaseTarget)
    const { data: rawPresentations } = await supabase
      .from('course_audio')
      .select('lego_id, s3_key')
      .eq('course_code', courseCode)
      .eq('role', 'presentation')
    const existingPresentations = (rawPresentations || []).filter(p => !p.s3_key || !p.s3_key.startsWith('pending/'))
    const legoIdsWithPresentation = new Set(existingPresentations.map(p => p.lego_id).filter(Boolean))
    for (const lego of (newLegos || [])) {
      if (lego.presentation_audio_id) continue
      if (legoIdsWithPresentation.has(lego.lego_id)) continue
      needed.push({ text: lego.known_text, language: course.known_lang, role: 'presentation', lego_id: lego.lego_id })
    }

    // Dedup + filter punctuation for cost estimation
    const uniqueNeeded = [...new Map(
      needed.map(n => [`${normalizeText(n.text)}|${n.language}|${n.role}`, n])
    ).values()].filter(n => !isPunctuationOnly(n.text))

    const totalChars = uniqueNeeded.reduce((sum, n) => sum + n.text.length, 0)
    const estimatedCost = (totalChars / 1000) * 0.016

    // Unique text counts for display
    const uniqueTexts = new Set()
    for (const src of [...(allLegos || []), ...(allSeeds || [])]) {
      if (!isPunctuationOnly(src.known_text)) uniqueTexts.add(`known|${normalizeText(src.known_text)}`)
      if (!isPunctuationOnly(src.target_text)) uniqueTexts.add(`target|${normalizeText(src.target_text)}`)
    }
    const uniqueKnownTexts = [...uniqueTexts].filter(k => k.startsWith('known|')).length
    const uniqueTargetTexts = [...uniqueTexts].filter(k => k.startsWith('target|')).length
    const totalPresentationsNeeded = newLegos?.length || 0

    res.json({
      courseCode,
      releaseTarget,
      course: {
        displayName: course.display_name,
        knownLang: course.known_lang,
        targetLang: course.target_lang,
        voiceConfig: course.voice_config
      },
      existing: totalExisting,
      missing: totalMissing,
      total: totalExisting + totalMissing,
      totalPhrases: phraseCount,
      totalPresentationsNeeded,
      uniqueKnownTexts,
      uniqueTargetTexts,
      estimatedCost: `$${estimatedCost.toFixed(2)}`,
      estimatedChars: totalChars,
      breakdown: {
        known: missingKnown,
        target1: missingTarget1,
        target2: missingTarget2,
        presentation: missingPresentation
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
    const { dryRun = false, limit = 50000, concurrency: requestedConcurrency, roles: requestedRoles } = req.body  // High default for bulk generation

    // Use requested concurrency if provided, clamped to 1-20, otherwise use env/default
    const concurrencyToUse = requestedConcurrency
      ? Math.max(1, Math.min(20, parseInt(requestedConcurrency, 10) || CONCURRENCY))
      : CONCURRENCY

    // Get course with voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const voiceConfig = course.voice_config || {}
    const voices = voiceConfig.voices || voiceConfig  // Support both nested and flat structure
    if (!voices.known || !voices.target1) {
      return res.status(400).json({
        error: 'Course missing voice configuration',
        voiceConfig
      })
    }

    // Release target — generate audio for all decomposed seeds
    // Uses actual max decomposed seed_number, not a configured cap
    const releaseTarget = await getEffectiveReleaseTarget(courseCode, course.seed_count)

    // Get practice phrases (paginated) - filtered by release target
    // IMPORTANT: Must use ORDER BY for consistent pagination results
    const PAGE_SIZE = 1000
    const phrases = []
    let phrasesOffset = 0
    let hasMorePhrases = true

    while (hasMorePhrases) {
      const { data: phrasesBatch, error: phrasesError } = await supabase
        .from('course_practice_phrases')
        .select('known_text, target_text, seed_number')
        .eq('course_code', courseCode)
        .lte('seed_number', releaseTarget)
        .order('id')
        .range(phrasesOffset, phrasesOffset + PAGE_SIZE - 1)

      if (phrasesError) throw phrasesError

      if (phrasesBatch && phrasesBatch.length > 0) {
        phrases.push(...phrasesBatch)
        hasMorePhrases = phrasesBatch.length === PAGE_SIZE
        phrasesOffset += PAGE_SIZE
      } else {
        hasMorePhrases = false
      }
    }

    // Get existing audio — single reliable query, no broken pagination
    const existingSet = await getExistingAudioSet(courseCode)

    const needed = []
    // Helper to get voice settings from config (supports nested voices structure)
    const getVoiceForRole = (role) => {
      const v = voices[role]
      if (!v) return null
      // Combine provider and voiceId: azure_en-GB-AdaMultilingualNeural
      if (v.provider && v.voiceId) return `${v.provider}_${v.voiceId}`
      return v.voiceId || v
    }
    const getSpeedForRole = (role) => voices[role]?.settings?.speed || 1.0

    for (const phrase of phrases) {
      // Skip punctuation-only known text
      if (!isPunctuationOnly(phrase.known_text)) {
        const knownKey = `${normalizeText(phrase.known_text)}|${course.known_lang}|known`
        if (!existingSet.has(knownKey)) {
          needed.push({
            text: phrase.known_text,
            language: course.known_lang,
            role: 'known',
            voiceId: getVoiceForRole('known'),
            speed: getSpeedForRole('known')
          })
        }
      }

      // Skip punctuation-only target text
      if (!isPunctuationOnly(phrase.target_text)) {
        for (const role of ['target1', 'target2']) {
          const targetKey = `${normalizeText(phrase.target_text)}|${course.target_lang}|${role}`
          if (!existingSet.has(targetKey)) {
            needed.push({
              text: phrase.target_text,
              language: course.target_lang,
              role,
              voiceId: getVoiceForRole(role),
              speed: getSpeedForRole(role)
            })
          }
        }
      }
    }

    // Also include LEGO debut audio (the LEGO text itself needs known/target1/target2)
    // This ensures the LEGO debut cycle has audio, not just practice phrases
    // Filter by release target to match /plan endpoint logic
    const { data: legos, error: legosError } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .lte('seed_number', releaseTarget)

    if (legosError) {
      logger.warn('Failed to fetch LEGOs for debut audio:', legosError.message)
    } else if (legos?.length > 0) {
      let legoAudioNeeded = 0
      for (const lego of legos) {
        // Skip punctuation-only LEGO text
        if (!isPunctuationOnly(lego.known_text)) {
          const knownKey = `${normalizeText(lego.known_text)}|${course.known_lang}|known`
          if (!existingSet.has(knownKey)) {
            needed.push({
              text: lego.known_text,
              language: course.known_lang,
              role: 'known',
              voiceId: getVoiceForRole('known'),
              speed: getSpeedForRole('known'),
              lego_id: lego.lego_id  // Track source for debugging
            })
            legoAudioNeeded++
          }
        }

        // Skip punctuation-only target text
        if (!isPunctuationOnly(lego.target_text)) {
          for (const role of ['target1', 'target2']) {
            const targetKey = `${normalizeText(lego.target_text)}|${course.target_lang}|${role}`
            if (!existingSet.has(targetKey)) {
              needed.push({
                text: lego.target_text,
                language: course.target_lang,
                role,
                voiceId: getVoiceForRole(role),
                speed: getSpeedForRole(role),
                lego_id: lego.lego_id
              })
              legoAudioNeeded++
            }
          }
        }
      }
      if (legoAudioNeeded > 0) {
        logger.info(`Found ${legoAudioNeeded} LEGO debut audio items needed (from ${legos.length} LEGOs)`)
      }
    }

    // Also include seed sentence audio (full seed sentences need known/target1/target2)
    // Only include released seeds up to release target (draft seeds have empty target_text)
    // Filter by release target to match /plan endpoint logic
    const { data: seeds, error: seedsError } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .eq('status', 'released')
      .lte('seed_number', releaseTarget)

    if (seedsError) {
      logger.warn('Failed to fetch seeds for audio:', seedsError.message)
    } else if (seeds?.length > 0) {
      let seedAudioNeeded = 0
      for (const seed of seeds) {
        // Skip punctuation-only seed text (unlikely for full sentences, but be safe)
        if (!isPunctuationOnly(seed.known_text)) {
          const knownKey = `${normalizeText(seed.known_text)}|${course.known_lang}|known`
          if (!existingSet.has(knownKey)) {
            needed.push({
              text: seed.known_text,
              language: course.known_lang,
              role: 'known',
              voiceId: getVoiceForRole('known'),
              speed: getSpeedForRole('known'),
              seed_number: seed.seed_number
            })
            seedAudioNeeded++
          }
        }

        // Skip punctuation-only target text
        if (!isPunctuationOnly(seed.target_text)) {
          for (const role of ['target1', 'target2']) {
            const targetKey = `${normalizeText(seed.target_text)}|${course.target_lang}|${role}`
            if (!existingSet.has(targetKey)) {
              needed.push({
                text: seed.target_text,
                language: course.target_lang,
                role,
                voiceId: getVoiceForRole(role),
                speed: getSpeedForRole(role),
                seed_number: seed.seed_number
              })
              seedAudioNeeded++
            }
          }
        }
      }
      if (seedAudioNeeded > 0) {
        logger.info(`Found ${seedAudioNeeded} seed sentence audio items needed (from ${seeds.length} seeds)`)
      }
    }

    // =========================================================================
    // AUTO-GENERATE COMPONENT PRESENTATION TEXT (so "Start Generation" is one-click)
    // Creates course_audio records with pending/ s3_keys for component phrases
    // that don't already have presentation audio. These get picked up below.
    // =========================================================================
    {
      const compTargetLangName = getLocalisedLangName(course.target_lang, course.known_lang)

      // Load (or auto-generate) presentation template for known language
      const compTemplate = await getOrCreatePresentationTemplate(course.known_lang)

      // Load component phrases for this course (within release target)
      const compPhrases = []
      let compOffset = 0
      let hasMoreComps = true
      while (hasMoreComps) {
        const { data: compBatch, error: compError } = await supabase
          .from('course_practice_phrases')
          .select('id, seed_number, lego_index, known_text, target_text, presentation_audio_id')
          .eq('course_code', courseCode)
          .eq('phrase_role', 'component')
          .lte('seed_number', releaseTarget)
          .order('id')
          .range(compOffset, compOffset + PAGE_SIZE - 1)

        if (compError) { logger.warn('Failed to fetch component phrases:', compError.message); break }
        if (compBatch && compBatch.length > 0) {
          compPhrases.push(...compBatch)
          hasMoreComps = compBatch.length === PAGE_SIZE
          compOffset += PAGE_SIZE
        } else {
          hasMoreComps = false
        }
      }

      if (compPhrases.length > 0) {
        // Load parent M-LEGOs for "as in" context
        const compSeedNumbers = [...new Set(compPhrases.map(c => c.seed_number))]
        const parentLegoMap = new Map()
        const COMP_SEED_BATCH = 500
        for (let i = 0; i < compSeedNumbers.length; i += COMP_SEED_BATCH) {
          const seedBatch = compSeedNumbers.slice(i, i + COMP_SEED_BATCH)
          const { data: parentLegos } = await supabase
            .from('course_legos')
            .select('seed_number, lego_index, known_text, target_text')
            .eq('course_code', courseCode)
            .eq('type', 'M')
            .in('seed_number', seedBatch)

          for (const l of (parentLegos || [])) {
            parentLegoMap.set(`${l.seed_number}:${l.lego_index}`, l)
          }
        }

        // Generate presentation text for each component
        const componentPresentations = []
        for (const comp of compPhrases) {
          const parent = parentLegoMap.get(`${comp.seed_number}:${comp.lego_index}`)
          if (!parent) continue

          const presText = compTemplate
            .replace('{target_lang_name}', compTargetLangName)
            .replace('{known}', comp.known_text)
            .replace('{seed}', parent.known_text)

          componentPresentations.push({
            phrase_id: comp.id,
            presentation_text: presText,
            presentation_audio_id: comp.presentation_audio_id
          })
        }

        // Check which presentation texts already exist in course_audio
        const compTextsNorm = componentPresentations.map(cp => normalizeForAudio(cp.presentation_text))
        const uniqueCompTexts = [...new Set(compTextsNorm)]
        const existingCompTexts = new Set()

        for (let i = 0; i < uniqueCompTexts.length; i += 50) {
          const batch = uniqueCompTexts.slice(i, i + 50)
          const { data: existing } = await supabase
            .from('course_audio')
            .select('text_normalized')
            .eq('course_code', courseCode)
            .eq('role', 'presentation')
            .in('text_normalized', batch)

          if (existing) {
            for (const rec of existing) existingCompTexts.add(rec.text_normalized)
          }
        }

        // Build new records for components that don't have presentation audio yet
        const presVoiceConfig = course.voice_config || {}
        const presVoiceId = presVoiceConfig.voices?.presentation?.voiceId
          ? `${presVoiceConfig.voices?.presentation?.provider || 'azure'}_${presVoiceConfig.voices.presentation.voiceId}`
          : presVoiceConfig.presentation || 'azure_en-GB-SoniaNeural'

        const newCompRecords = componentPresentations
          .filter(cp => !existingCompTexts.has(normalizeForAudio(cp.presentation_text)))
          .map(cp => ({
            course_code: courseCode,
            text: cp.presentation_text,
            text_normalized: normalizeForAudio(cp.presentation_text),
            language: course.known_lang,
            role: 'presentation',
            voice_id: presVoiceId,
            origin: 'tts',
            s3_key: `pending/${uuidv4().toUpperCase()}.mp3`
          }))

        if (newCompRecords.length > 0) {
          const { error: compUpsertError } = await supabase
            .from('course_audio')
            .upsert(newCompRecords, {
              onConflict: 'course_code,text_normalized,language,role',
              ignoreDuplicates: true
            })

          if (compUpsertError) {
            logger.error('Component presentation auto-upsert error:', compUpsertError)
          } else {
            logger.info(`Auto-created ${newCompRecords.length} component presentation records (from ${compPhrases.length} component phrases)`)
          }
        } else if (compPhrases.length > 0) {
          logger.info(`All ${componentPresentations.length} component presentations already have course_audio records`)
        }
      }
    }

    // Also include presentation audio that needs generation (pending/ s3_key)
    const { data: pendingPresentations } = await supabase
      .from('course_audio')
      .select('id, text, language, voice_id, lego_id')
      .eq('course_code', courseCode)
      .eq('role', 'presentation')
      .like('s3_key', 'pending/%')

    if (pendingPresentations?.length > 0) {
      logger.info(`Found ${pendingPresentations.length} pending presentation audio items`)
      for (const pres of pendingPresentations) {
        // Use presentation voice from config, or fallback to known voice
        const presVoice = getVoiceForRole('presentation') || pres.voice_id || getVoiceForRole('known')
        needed.push({
          text: pres.text,
          language: pres.language || course.known_lang,
          role: 'presentation',
          voiceId: presVoice,
          speed: getSpeedForRole('presentation') || getSpeedForRole('known') || 1.0,
          lego_id: pres.lego_id || null  // Preserve lego_id for linking after generation
        })
      }
    }

    // Also include LEGOs that are MISSING presentation audio entirely (not just pending)
    // This matches the /plan endpoint logic for counting missing presentations
    const { data: newLegos } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, known_text, presentation_audio_id')
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .lte('seed_number', releaseTarget)

    if (newLegos?.length > 0) {
      // Get existing presentation audio (filter pending client-side)
      const { data: rawExistPres } = await supabase
        .from('course_audio')
        .select('lego_id, s3_key')
        .eq('course_code', courseCode)
        .eq('role', 'presentation')

      // Build set of lego_ids that have presentation audio in course_audio
      const legoIdsWithPresentation = new Set(
        (rawExistPres || [])
          .filter(p => !p.s3_key || !p.s3_key.startsWith('pending/'))
          .map(p => p.lego_id).filter(Boolean)
      )

      // Exclude LEGOs that have pending presentations (already added above)
      const pendingLegoIds = new Set(
        (pendingPresentations || []).map(p => p.lego_id).filter(Boolean)
      )

      // Get (or auto-generate) presentation template for this course
      const targetLangName = getLocalisedLangName(course.target_lang, course.known_lang)
      const presentationTemplate = await getOrCreatePresentationTemplate(course.known_lang)

      // Build short template (no "as in" context) for LEGOs where no good context exists.
      // Universal: splice out everything between {known}'s closing delimiter and
      // {seed}'s closing delimiter. Works for any language's template.
      let shortPresentationTemplate = presentationTemplate
      const _knownIdx = presentationTemplate.indexOf('{known}')
      const _seedIdx = presentationTemplate.indexOf('{seed}')
      if (_knownIdx !== -1 && _seedIdx !== -1) {
        const _afterKnown = presentationTemplate.substring(_knownIdx + 7)
        const _knownEndMatch = _afterKnown.match(/^['"}\u300D]?[,]\s*|^['"}\u300D]?\s*[—–]\s*/)
        const _knownClauseEnd = _knownIdx + 7 + (_knownEndMatch ? _knownEndMatch[0].length : 0)

        const _afterSeed = presentationTemplate.substring(_seedIdx + 6)
        const _seedEndMatch = _afterSeed.match(/^['"}\u300D]?(?:\uCC98\uB7FC|\u306E\u3088\u3046\u306B|[^\s,\u2014\u2013{]*?)?\s*[,\u2014\u2013]\s*/)
        const _seedClauseEnd = _seedIdx + 6 + (_seedEndMatch ? _seedEndMatch[0].length : 0)

        shortPresentationTemplate = presentationTemplate.substring(0, _knownClauseEnd)
          + presentationTemplate.substring(_seedClauseEnd)
      }

      // Load seed sentences for context
      const legoSeedNumbers = [...new Set(newLegos.map(l => l.seed_number).filter(Boolean))]
      const seedTextMap = {}
      if (legoSeedNumbers.length > 0) {
        const SEED_BATCH = 500
        for (let i = 0; i < legoSeedNumbers.length; i += SEED_BATCH) {
          const batch = legoSeedNumbers.slice(i, i + SEED_BATCH)
          const { data: seeds } = await supabase
            .from('course_seeds')
            .select('seed_number, known_text')
            .eq('course_code', courseCode)
            .in('seed_number', batch)
          if (seeds) for (const s of seeds) seedTextMap[s.seed_number] = s.known_text
        }
      }

      // Load USE phrases for context (grouped by seed_number:lego_index)
      const usePhraseMapForPres = {}
      let useOffset = 0
      let hasMoreUse = true
      while (hasMoreUse) {
        const { data: useBatch } = await supabase
          .from('course_practice_phrases')
          .select('seed_number, lego_index, known_text')
          .eq('course_code', courseCode)
          .eq('phrase_role', 'use')
          .order('id')
          .range(useOffset, useOffset + 999)
        if (useBatch && useBatch.length > 0) {
          for (const p of useBatch) {
            const key = `${p.seed_number}:${p.lego_index}`
            if (!usePhraseMapForPres[key]) usePhraseMapForPres[key] = []
            usePhraseMapForPres[key].push(p.known_text)
          }
          hasMoreUse = useBatch.length === 1000
          useOffset += 1000
        } else {
          hasMoreUse = false
        }
      }

      // Deterministic hash for weighted random context selection
      function deterministicRand(legoId) {
        let h = 0
        for (let i = 0; i < legoId.length; i++) {
          h = ((h << 5) - h + legoId.charCodeAt(i)) | 0
        }
        return (((h >>> 0) % 10000) / 10000)
      }

      // Find LEGOs missing presentation audio and generate the text
      let missingPresentationCount = 0
      let contextFromSeed = 0, contextFromUse = 0, contextNone = 0
      for (const lego of newLegos) {
        // Skip if already bound on the LEGO itself (authoritative)
        if (lego.presentation_audio_id) continue
        // Skip if presentation audio exists in course_audio by lego_id or is pending
        if (legoIdsWithPresentation.has(lego.lego_id) || pendingLegoIds.has(lego.lego_id)) {
          continue
        }

        // Parse lego_index from lego_id (e.g., "S0001L03" → 3)
        const legoIndexMatch = lego.lego_id.match(/L(\d+)$/)
        const legoIndex = legoIndexMatch ? parseInt(legoIndexMatch[1], 10) : 1

        // Find context sentence containing the known text
        const seedText = seedTextMap[lego.seed_number] || lego.known_text
        const knownLower = lego.known_text.toLowerCase()
        const knownVariants = [knownLower]
        if (knownLower.includes(' / ')) {
          knownVariants.push(...knownLower.split(' / ').map(s => s.trim()))
        }
        const textContainsKnown = (text) => {
          const t = text.toLowerCase()
          return knownVariants.some(v => t.includes(v))
        }

        const key = `${lego.seed_number}:${legoIndex}`
        const usePhrases = (usePhraseMapForPres[key] || []).filter(p => textContainsKnown(p))
        const seedValid = textContainsKnown(seedText)

        // Weighted random: ~60% USE phrase, ~25% seed, ~15% no context
        const roll = deterministicRand(lego.lego_id)
        let contextText = null

        if (usePhrases.length > 0 && seedValid) {
          if (roll < 0.60) {
            const useIdx = Math.floor(deterministicRand(lego.lego_id + ':use') * usePhrases.length)
            contextText = usePhrases[useIdx]
            contextFromUse++
          } else if (roll < 0.85) {
            contextText = seedText
            contextFromSeed++
          } else {
            contextNone++
          }
        } else if (usePhrases.length > 0) {
          if (roll < 0.80) {
            const useIdx = Math.floor(deterministicRand(lego.lego_id + ':use') * usePhrases.length)
            contextText = usePhrases[useIdx]
            contextFromUse++
          } else {
            contextNone++
          }
        } else if (seedValid) {
          if (roll < 0.70) {
            contextText = seedText
            contextFromSeed++
          } else {
            contextNone++
          }
        } else {
          contextNone++
        }

        // Skip context if known text overlaps too much (redundant)
        if (contextText && lego.known_text.length > 0) {
          const overlapRatio = lego.known_text.length / contextText.length
          if (overlapRatio > 0.5) {
            contextText = null
            contextNone++
          }
        }

        const finalTemplate = contextText ? presentationTemplate : shortPresentationTemplate

        // For slash-compound known_text, use first option only
        const knownForPres = lego.known_text.includes(' / ')
          ? lego.known_text.split(' / ')[0].trim()
          : lego.known_text

        let presText = finalTemplate
          .replace('{target_lang_name}', targetLangName)
          .replace('{known}', knownForPres)
          .replace('{seed}', contextText || '')

        const presVoice = getVoiceForRole('presentation') || getVoiceForRole('known')
        needed.push({
          text: presText,
          language: course.known_lang,
          role: 'presentation',
          voiceId: presVoice,
          speed: getSpeedForRole('presentation') || getSpeedForRole('known') || 1.0,
          lego_id: lego.lego_id
        })
        missingPresentationCount++
      }

      if (missingPresentationCount > 0) {
        logger.info(`Found ${missingPresentationCount} LEGOs missing presentation audio (context: ${contextFromSeed} seed, ${contextFromUse} USE, ${contextNone} none)`)
      }
    }

    // Filter by requested roles if specified (e.g. roles: ['known', 'presentation'])
    if (requestedRoles && Array.isArray(requestedRoles) && requestedRoles.length > 0) {
      const allowedRoles = new Set(requestedRoles)
      const beforeCount = needed.length
      const filtered = needed.filter(n => allowedRoles.has(n.role))
      logger.info(`Role filter [${requestedRoles.join(', ')}]: ${beforeCount} → ${filtered.length} items`)
      needed.length = 0
      needed.push(...filtered)
    }

    // Deduplicate using normalizeText for consistent keys (matches existingSet logic)
    logger.info(`Before dedup: ${needed.length} items (known=${needed.filter(n=>n.role==='known').length}, target1=${needed.filter(n=>n.role==='target1').length}, target2=${needed.filter(n=>n.role==='target2').length}, presentation=${needed.filter(n=>n.role==='presentation').length})`)
    const uniqueNeeded = [...new Map(
      needed.map(n => [`${normalizeText(n.text)}|${n.language}|${n.role}`, n])
    ).values()].slice(0, limit)
    logger.info(`After dedup: ${uniqueNeeded.length} unique items`)

    // Load pre-computed gender expansions from DB
    let genderMap = new Map()
    if (genderHaikuService.GENDERED_LANGUAGES.includes(course.target_lang) && !dryRun) {
      genderMap = await genderHaikuService.loadGenderMap(courseCode, supabase)
      logger.info(`Loaded ${genderMap.size} gender expansions from DB`)
    }

    if (dryRun) {
      return res.json({
        dryRun: true,
        wouldGenerate: uniqueNeeded.length,
        samples: uniqueNeeded.slice(0, 10)
      })
    }

    // Start progress tracking
    startWork('generate', courseCode, uniqueNeeded.length)

    // Emit narrative beat
    const roleCounts = {}
    for (const n of uniqueNeeded) roleCounts[n.role] = (roleCounts[n.role] || 0) + 1
    const roleDesc = Object.entries(roleCounts).map(([r, c]) => `${c} ${r}`).join(', ')
    emitProgress(supabase, courseCode, `Audio generation started: ${uniqueNeeded.length} files (${roleDesc})`, { phase: 'audio', action: 'generate', total: uniqueNeeded.length, roles: roleCounts })

    // Process items in parallel with concurrency limit
    logger.info(`Generating ${uniqueNeeded.length} audio files with concurrency=${concurrencyToUse}`)

    const results = { success: 0, failed: 0, errors: [] }

    // Helper to generate a single audio item
    const generateItem = async (item) => {
      // -----------------------------------------------------------------------
      // Cross-course audio sharing: reuse S3 files from sibling courses
      // If another course already has audio for the same text+language+role+voice,
      // create a new course_audio row pointing to the same S3 file (skip TTS).
      // -----------------------------------------------------------------------
      try {
        const { data: siblingAudio } = await supabase
          .from('course_audio')
          .select('s3_key, duration_ms, word_boundaries')
          .neq('course_code', courseCode)
          .eq('text_normalized', normalizeForAudio(item.text))
          .eq('language', item.language)
          .eq('role', item.role)
          .eq('voice_id', item.voiceId)
          .not('s3_key', 'like', 'pending/%')
          .limit(1)
          .single()

        if (siblingAudio?.s3_key) {
          // Reuse existing S3 file — just insert a new course_audio row
          const { data: insertedAudio, error: insertError } = await supabase
            .from('course_audio')
            .upsert({
              course_code: courseCode,
              text: item.text,
              text_normalized: normalizeForAudio(item.text),
              language: item.language,
              role: item.role,
              voice_id: item.voiceId,
              origin: 'tts',
              s3_key: siblingAudio.s3_key,
              duration_ms: siblingAudio.duration_ms,
              lego_id: item.lego_id || null,
              word_boundaries: siblingAudio.word_boundaries || null
            }, {
              onConflict: 'course_code,text_normalized,language,role'
            })
            .select('id')
            .single()

          if (!insertError && insertedAudio) {
            // Link presentation audio if needed
            if (item.role === 'presentation' && item.lego_id && insertedAudio.id) {
              const legoMatch = item.lego_id.match(/S(\d+)L(\d+)/)
              if (legoMatch) {
                await supabase
                  .from('course_legos')
                  .update({ presentation_audio_id: insertedAudio.id })
                  .eq('course_code', courseCode)
                  .eq('seed_number', parseInt(legoMatch[1], 10))
                  .eq('lego_index', parseInt(legoMatch[2], 10))
              }
            }
            updateWork(item.text, true)
            logger.info(`Shared: ${item.role} - "${item.text.substring(0, 40)}..." (reused from sibling course)`)
            return { success: true, item, shared: true }
          }
        }
      } catch (e) {
        // Not found or error — fall through to normal TTS generation
      }

      // Determine TTS provider from voice config
      // Voice format: azure_es-ES-ElviraNeural or elevenlabs_voiceId
      const [provider, voiceName] = item.voiceId.split('_', 2)

      // Use speed from voice config (everything is a parameter!)
      const speed = item.speed || 1.0

      // Gender expansion for target language audio
      // Pre-computed by Haiku (or regex fallback for marker-based text)
      let textForTTS = item.text
      const genderKey = `${item.text}|${item.language}|${item.role}`
      const genderResult = genderMap.get(genderKey)
      if (genderResult?.wasModified) {
        textForTTS = genderResult.expandedText
        logger.info(`Gender: "${item.text}" → "${textForTTS}" (${item.role})`)
      } else if ((item.role === 'target1' || item.role === 'target2') && genderService.hasGenderMarker(item.text)) {
        // Fallback: text with explicit markers like "cansado(a)" — use regex expander
        const markerResult = genderService.analyzeAndExpand(item.text, item.language, item.role)
        if (markerResult.wasModified) {
          textForTTS = markerResult.expandedText
          logger.info(`Gender (marker): "${item.text}" → "${textForTTS}" (${item.role})`)
        }
      }

      // Generate TTS audio using gender-expanded text
      let rawAudioBuffer, wordBoundaries
      if (provider === 'azure') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName: voiceName,
          speed
        }))
      } else if (provider === 'elevenlabs') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceName,
          speed
        }))
      } else if (provider === 'xai') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
          apiKey: process.env.XAI_API_KEY,
          voiceId: voiceName,
          language: toBcp47(item.language),
        }))
      } else {
        throw new Error(`Unknown TTS provider: ${provider}`)
      }

      // Master audio: normalize loudness and extract duration
      // Note: xAI does not expose an API-level speed parameter, so xAI audio
      // is always generated at natural speed. Downstream cadence playback speed
      // adjustments are applied in the player, not at TTS time.
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
      // Include lego_id for presentation audio (needed for /plan matching)
      // Use .select('id') to get the ID back directly for linking
      const { data: insertedAudio, error: insertError } = await supabase
        .from('course_audio')
        .upsert({
          course_code: courseCode,
          text: item.text,
          text_normalized: normalizeForAudio(item.text),
          language: item.language,
          role: item.role,
          voice_id: item.voiceId,
          origin: 'tts',
          s3_key: s3Key,
          duration_ms: durationMs,
          lego_id: item.lego_id || null,
          word_boundaries: wordBoundaries || null
        }, {
          onConflict: 'course_code,text_normalized,language,role'
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // For presentation audio, immediately link to course_legos using the ID we just got
      // NO separate query needed - use insertedAudio.id directly
      if (item.role === 'presentation' && item.lego_id && insertedAudio?.id) {
        // Parse lego_id (e.g., "S0001L03") to get seed_number and lego_index
        const legoMatch = item.lego_id.match(/S(\d+)L(\d+)/)
        if (legoMatch) {
          const seedNumber = parseInt(legoMatch[1], 10)
          const legoIndex = parseInt(legoMatch[2], 10)

          const { error: updateError } = await supabase
            .from('course_legos')
            .update({ presentation_audio_id: insertedAudio.id })
            .eq('course_code', courseCode)
            .eq('seed_number', seedNumber)
            .eq('lego_index', legoIndex)

          if (updateError) {
            logger.warn(`Could not update course_legos.presentation_audio_id for ${item.lego_id}: ${updateError.message}`)
          } else {
            logger.info(`Linked presentation audio ${insertedAudio.id} to ${item.lego_id}`)
          }
        }
      }

      updateWork(item.text, true)
      logger.info(`Generated: ${item.role} - "${item.text.substring(0, 30)}..."`)
      return { success: true, item }
    }

    // Process in parallel batches
    for (let i = 0; i < uniqueNeeded.length; i += concurrencyToUse) {
      // Check for cancellation at the start of each batch
      if (currentWork.cancelled) {
        logger.info(`[PROGRESS] Cancelled after ${currentWork.current}/${currentWork.total} items`)
        break
      }

      const batch = uniqueNeeded.slice(i, i + concurrencyToUse)
      const batchNum = Math.floor(i / concurrencyToUse) + 1
      const totalBatches = Math.ceil(uniqueNeeded.length / concurrencyToUse)

      logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      // Wrap each item with a 120s timeout to prevent hung Supabase/TTS calls from blocking the batch
      const withTimeout = (fn, ms = 120_000) => Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s`)), ms))
      ])
      const batchResults = await Promise.allSettled(batch.map(item => withTimeout(() => generateItem(item))))

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

      // Emit progress every 10 batches
      if (batchNum % 10 === 0) {
        emitProgress(supabase, courseCode, `Audio: ${results.success}/${uniqueNeeded.length} generated${results.failed > 0 ? ` (${results.failed} failed)` : ''}`, { phase: 'audio', action: 'generate', progress: results.success, total: uniqueNeeded.length, failed: results.failed })
      }

      // Periodically link audio IDs every 10 batches so progress is visible
      // even if generation is interrupted
      if (batchNum % 10 === 0) {
        try {
          const mid = await linkAudioIds(courseCode)
          if (mid.total > 0) logger.info(`Mid-generation link: bound ${mid.total} audio IDs`)
        } catch (e) {
          logger.warn(`Mid-generation link failed: ${e.message}`)
        }
      }
    }

    const wasCancelled = currentWork.cancelled
    endWork()

    // Auto-link audio IDs to phrases/legos/seeds after generation
    let linked = 0
    if (!wasCancelled) {
      try {
        const linkResults = await linkAudioIds(courseCode)
        linked = linkResults.total
        if (linked > 0) {
          logger.info(`Auto-linked ${linked} audio IDs for ${courseCode}`)
        }
      } catch (linkErr) {
        logger.error(`Auto-link failed for ${courseCode}: ${linkErr.message}`)
      }
    }

    if (!wasCancelled && results.success > 0) {
      await bumpCourseVersion(supabase, courseCode, 'patch')
    }

    // Emit completion
    const statusWord = wasCancelled ? 'Audio generation cancelled' : 'Audio generation complete'
    emitProgress(supabase, courseCode, `${statusWord}: ${results.success}/${uniqueNeeded.length} generated${results.failed > 0 ? `, ${results.failed} failed` : ''}${linked > 0 ? `, ${linked} audio IDs linked` : ''}`, { phase: 'audio', action: 'generate-complete', success: results.success, failed: results.failed, linked })

    res.json({
      status: wasCancelled ? 'cancelled' : 'completed',
      courseCode,
      total: uniqueNeeded.length,
      success: results.success,
      failed: results.failed,
      cancelled: wasCancelled,
      errors: results.errors.slice(0, 10),
      linked
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
    const { role, dryRun = false, limit, flaggedOnly = false } = req.body

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
      .eq('course_code', courseCode)
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
    let flagRegenCounts = {}  // Map of audio_uuid -> regen_count for TTS variation

    if (flaggedOnly) {
      // Get audio marked for regeneration from audio_flags table (new simplified system)
      const { data: flags, error: flagsError } = await supabase
        .from('audio_flags')
        .select('audio_uuid, regen_count')
        .eq('course_code', courseCode)
        .eq('status', 'flagged')

      if (flagsError) throw flagsError

      const flaggedIds = [...new Set(flags?.map(f => f.audio_uuid).filter(Boolean) || [])]

      // Build map of audio_uuid -> regen_count for variation selection
      for (const f of (flags || [])) {
        if (f.audio_uuid) flagRegenCounts[f.audio_uuid] = f.regen_count || 0
      }

      if (flaggedIds.length === 0) {
        return res.json({
          status: 'no_pending',
          courseCode,
          role,
          flaggedOnly: true,
          message: `No audio pending regeneration for course`
        })
      }

      // Get audio that matches both role AND is flagged (batch to avoid header overflow)
      const BATCH_SIZE = 100
      let existingAudio = []
      for (let i = 0; i < flaggedIds.length; i += BATCH_SIZE) {
        const batch = flaggedIds.slice(i, i + BATCH_SIZE)
        let flaggedQuery = supabase
          .from('course_audio')
          .select('id, text, text_normalized, language, role, voice_id, s3_key')
          .eq('course_code', courseCode)
          .eq('role', role)
          .in('id', batch)

        const { data, error: audioError } = await flaggedQuery
        if (audioError) throw audioError
        if (data) existingAudio = existingAudio.concat(data)
      }
      if (limit) existingAudio = existingAudio.slice(0, limit)
      audioToRegenerate = existingAudio
    } else {
      // Get all audio for this role
      let allQuery = supabase
        .from('course_audio')
        .select('id, text, text_normalized, language, role, voice_id, s3_key')
        .eq('course_code', courseCode)
        .eq('role', role)

      if (limit) allQuery = allQuery.limit(limit)

      const { data: existingAudio, error: audioError } = await allQuery

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

    // Load pre-computed gender expansions from DB
    let genderMap = new Map()
    if ((role === 'target1' || role === 'target2') &&
        genderHaikuService.GENDERED_LANGUAGES.includes(language) &&
        !dryRun) {
      genderMap = await genderHaikuService.loadGenderMap(courseCode, supabase)
      logger.info(`Loaded ${genderMap.size} gender expansions from DB`)
    }

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

    // Use flagRegenCounts from audio_flags query (built earlier in flaggedOnly block)
    // This tracks which TTS variation to use (Azure is deterministic)
    const regenerationCounts = flaggedOnly ? flagRegenCounts : {}
    if (flaggedOnly) {
      logger.info(`Got regeneration counts for ${Object.keys(regenerationCounts).length} flagged items`)
    }

    // Process items in parallel with concurrency limit
    logger.info(`Regenerating ${audioToRegenerate.length} ${role} audio files with concurrency=${CONCURRENCY}`)

    const results = { success: 0, failed: 0, errors: [] }
    // Use speed from voice config (everything is a parameter!)
    const speed = voiceSettings.settings?.speed || 1.0

    // Helper to regenerate a single audio item
    const regenerateItem = async (item) => {
      // Get regeneration attempt count for this item (Azure determinism workaround)
      const regenerationAttempt = (regenerationCounts[item.id] || 0) + 1

      // Gender expansion for target language audio
      // Pre-computed by Haiku (or regex fallback for marker-based text)
      let textForTTS = item.text
      const genderKey = `${item.text}|${language}|${role}`
      const genderResult = genderMap.get(genderKey)
      if (genderResult?.wasModified) {
        textForTTS = genderResult.expandedText
        logger.info(`Gender: "${item.text}" → "${textForTTS}" (${role})`)
      } else if ((role === 'target1' || role === 'target2') && genderService.hasGenderMarker(item.text)) {
        // Fallback: text with explicit markers like "cansado(a)" — use regex expander
        const markerResult = genderService.analyzeAndExpand(item.text, language, role)
        if (markerResult.wasModified) {
          textForTTS = markerResult.expandedText
          logger.info(`Gender (marker): "${item.text}" → "${textForTTS}" (${role})`)
        }
      }

      // Generate TTS audio using provider from voice config
      let rawAudioBuffer, wordBoundaries
      if (voiceProvider === 'azure') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName: voiceId,
          speed,
          regenerationAttempt  // Pass to TTS for variation
        }))
      } else if (voiceProvider === 'elevenlabs') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceId,
          speed
        }))
      } else if (voiceProvider === 'xai') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
          apiKey: process.env.XAI_API_KEY,
          voiceId: voiceId,
          language: toBcp47(language),
        }))
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
          duration_ms: durationMs,
          word_boundaries: wordBoundaries || null
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      updateWork(item.text, true)
      logger.info(`Regenerated: ${role} - "${item.text.substring(0, 30)}..." (${durationMs}ms)`)
      return { success: true, item, audioId }
    }

    // Track successfully regenerated items for review
    const regeneratedItems = []

    // Process in parallel batches
    for (let i = 0; i < audioToRegenerate.length; i += CONCURRENCY) {
      // Check for cancellation at the start of each batch
      if (currentWork.cancelled) {
        logger.info(`[PROGRESS] Cancelled after ${currentWork.current}/${currentWork.total} items`)
        break
      }

      const batch = audioToRegenerate.slice(i, i + CONCURRENCY)
      const batchNum = Math.floor(i / CONCURRENCY) + 1
      const totalBatches = Math.ceil(audioToRegenerate.length / CONCURRENCY)

      logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      const batchResults = await Promise.allSettled(batch.map(regenerateItem))

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j]
        if (result.status === 'fulfilled') {
          results.success++
          // Track for review
          regeneratedItems.push({
            id: result.value.item.id,
            audioId: result.value.audioId,
            text: result.value.item.text,
            role: result.value.item.role
          })
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

    // Note: Flag stays at 'flagged' - user will delete it when satisfied with the audio
    // This allows the regenerate-review-regenerate cycle until happy

    // Increment regen_count for successfully regenerated items (for next TTS variation)
    if (flaggedOnly && regeneratedItems.length > 0) {
      const regeneratedIds = regeneratedItems.map(r => r.id)
      for (const audioUuid of regeneratedIds) {
        const currentCount = flagRegenCounts[audioUuid] || 0
        await supabase
          .from('audio_flags')
          .update({ regen_count: currentCount + 1 })
          .eq('audio_uuid', audioUuid)
          .eq('course_code', courseCode)
      }
      logger.info(`Incremented regen_count for ${regeneratedIds.length} flagged items`)
    }

    // For presentation audio: bind presentation_audio_id to course_legos
    // This is the authoritative binding - the learning app uses this ID directly
    if (role === 'presentation' && regeneratedItems.length > 0) {
      logger.info(`Binding presentation_audio_id for ${regeneratedItems.length} LEGOs...`)

      // Get the lego_id for each regenerated audio (batch to avoid header overflow)
      const audioIds = regeneratedItems.map(r => r.id)
      let audioRecords = []
      for (let i = 0; i < audioIds.length; i += 100) {
        const batch = audioIds.slice(i, i + 100)
        const { data } = await supabase
          .from('course_audio')
          .select('id, lego_id')
          .in('id', batch)
        if (data) audioRecords = audioRecords.concat(data)
      }

      let boundCount = 0
      for (const audio of audioRecords || []) {
        if (!audio.lego_id) continue

        // Parse lego_id (e.g., "S0001L03") to get seed_number and lego_index
        const match = audio.lego_id.match(/S(\d+)L(\d+)/)
        if (!match) continue

        const seedNumber = parseInt(match[1], 10)
        const legoIndex = parseInt(match[2], 10)

        const { error: updateError } = await supabase
          .from('course_legos')
          .update({ presentation_audio_id: audio.id })
          .eq('course_code', courseCode)
          .eq('seed_number', seedNumber)
          .eq('lego_index', legoIndex)

        if (!updateError) boundCount++
      }

      logger.info(`Bound presentation_audio_id for ${boundCount} LEGOs`)
    }

    const wasCancelled = currentWork.cancelled
    endWork()

    res.json({
      status: wasCancelled ? 'cancelled' : 'completed',
      courseCode,
      role,
      voiceId,
      total: audioToRegenerate.length,
      success: results.success,
      failed: results.failed,
      cancelled: wasCancelled,
      errors: results.errors.slice(0, 10),
      regeneratedItems: regeneratedItems.slice(0, 50) // Return up to 50 for review
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

    // Normalize language to ISO 639-3 (e.g. 'en-GB' → 'eng')
    const normalizedLanguage = toIso3(language)

    const { data, error } = await supabase
      .from('course_audio')
      .upsert({
        course_code: courseCode,
        text,
        text_normalized: normalizeForAudio(text),
        language: normalizedLanguage,
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
// POST REGENERATE-PRESENTATIONS - Regenerate presentation text for a course
// =============================================================================

app.post('/regenerate-presentations/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { dryRun = true, regenerateAudio = false, regenerateAll = false } = req.body

    logger.info(`Regenerating presentations for ${courseCode} (dryRun=${dryRun}, regenerateAll=${regenerateAll})`)

    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const knownLang = course.known_lang
    const targetLang = course.target_lang
    const targetLangName = getLocalisedLangName(targetLang, knownLang)

    // Get template for this known language
    const template = await getOrCreatePresentationTemplate(knownLang)
    logger.info(`Using template: ${template}`)

    // Get LEGOs where is_new=true (only new introductions need presentation audio)
    const PAGE_SIZE = 1000
    let allLegos = []
    let legosOffset = 0
    let hasMoreLegos = true

    while (hasMoreLegos) {
      const { data: legosBatch, error: legosError } = await supabase
        .from('course_legos')
        .select('lego_id, known_text, target_text, seed_number')
        .eq('course_code', courseCode)
        .eq('is_new', true)
        .range(legosOffset, legosOffset + PAGE_SIZE - 1)

      if (legosError) throw legosError

      if (legosBatch && legosBatch.length > 0) {
        allLegos.push(...legosBatch)
        hasMoreLegos = legosBatch.length === PAGE_SIZE
        legosOffset += PAGE_SIZE
      } else {
        hasMoreLegos = false
      }
    }

    // If not regenerateAll, filter out LEGOs that already have presentation audio
    let legos = allLegos
    if (!regenerateAll && allLegos.length > 0) {
      const existingPresIds = new Set()
      for (let i = 0; i < allLegos.length; i += PAGE_SIZE) {
        const batch = allLegos.slice(i, i + PAGE_SIZE).map(l => l.lego_id)
        const { data: existing } = await supabase
          .from('course_audio')
          .select('lego_id')
          .eq('course_code', courseCode)
          .eq('role', 'presentation')
          .in('lego_id', batch)
        if (existing) {
          for (const rec of existing) existingPresIds.add(rec.lego_id)
        }
      }
      legos = allLegos.filter(l => !existingPresIds.has(l.lego_id))
      logger.info(`Filtered to ${legos.length} LEGOs missing presentation audio (${existingPresIds.size} already have it)`)
    }

    if (legos.length === 0) {
      return res.json({
        success: true,
        message: 'No LEGOs found for this course',
        count: 0
      })
    }

    // Get all seed sentences for context (paginated in batches of seed numbers)
    const seedNumbers = [...new Set(legos.map(l => l.seed_number).filter(Boolean))]

    let seedMap = {}
    if (seedNumbers.length > 0) {
      // Query seeds in batches to avoid "too many parameters" error
      const SEED_BATCH_SIZE = 500
      for (let i = 0; i < seedNumbers.length; i += SEED_BATCH_SIZE) {
        const seedNumberBatch = seedNumbers.slice(i, i + SEED_BATCH_SIZE)
        const { data: seeds, error: seedsError } = await supabase
          .from('course_seeds')
          .select('seed_number, known_text')
          .eq('course_code', courseCode)
          .in('seed_number', seedNumberBatch)

        if (!seedsError && seeds) {
          for (const s of seeds) {
            seedMap[s.seed_number] = s.known_text
          }
        }
      }
    }

    // Generate presentation text for each LEGO
    // Short template (no "as in" context) for alternating in early seeds
    const shortTemplate = template
      .replace(/, as in — '\{seed\}',/g, ',')
      .replace(/ as in — '\{seed\}' —| como en — '\{seed\}' —| comme dans — '\{seed\}' —| wie in — '\{seed\}' —| como em — '\{seed\}' —| come in — '\{seed\}' —| fel yn — '\{seed\}' —| — 「\{seed\}」のように —| — '\{seed\}'처럼 —| كما في — '\{seed\}' —| kaip — '\{seed\}' —| 如「\{seed\}」—|, as in '\{seed\}'|，如"\{seed\}"|, fel yn '\{seed\}'|, como en '\{seed\}'/g, '')

    // Load USE phrases for context fallback when seed sentence doesn't contain the known_text
    // Group by seed_number + lego_index for efficient lookup
    const usePhraseMap = {}  // "seed_number:lego_index" -> [known_text, ...]
    let usePhraseOffset = 0
    let hasMoreUsePhrases = true
    while (hasMoreUsePhrases) {
      const { data: useBatch, error: useError } = await supabase
        .from('course_practice_phrases')
        .select('seed_number, lego_index, known_text')
        .eq('course_code', courseCode)
        .eq('phrase_role', 'use')
        .order('id')
        .range(usePhraseOffset, usePhraseOffset + PAGE_SIZE - 1)

      if (useError) { logger.warn('Failed to fetch USE phrases:', useError.message); break }
      if (useBatch && useBatch.length > 0) {
        for (const p of useBatch) {
          const key = `${p.seed_number}:${p.lego_index}`
          if (!usePhraseMap[key]) usePhraseMap[key] = []
          usePhraseMap[key].push(p.known_text)
        }
        hasMoreUsePhrases = useBatch.length === PAGE_SIZE
        usePhraseOffset += PAGE_SIZE
      } else {
        hasMoreUsePhrases = false
      }
    }

    // Deterministic hash for weighted random context selection
    // Returns a float 0..1 based on the lego_id string
    function deterministicRand(legoId) {
      let h = 0
      for (let i = 0; i < legoId.length; i++) {
        h = ((h << 5) - h + legoId.charCodeAt(i)) | 0
      }
      return (((h >>> 0) % 10000) / 10000)
    }

    const presentations = []
    let contextFromSeed = 0, contextFromUse = 0, contextNone = 0
    for (const lego of legos) {
      const seedText = seedMap[lego.seed_number] || lego.known_text

      // Parse lego_id to get lego_index (e.g., "S0001L03" → 3)
      const legoIndexMatch = lego.lego_id.match(/L(\d+)$/)
      const legoIndex = legoIndexMatch ? parseInt(legoIndexMatch[1], 10) : 1

      const knownLower = lego.known_text.toLowerCase()
      // For compound known_text like "to listen / to hear", also try each part
      const knownVariants = [knownLower]
      if (knownLower.includes(' / ')) {
        knownVariants.push(...knownLower.split(' / ').map(s => s.trim()))
      }
      const textContainsKnown = (text) => {
        const t = text.toLowerCase()
        return knownVariants.some(v => t.includes(v))
      }

      // Build candidate pool: seed sentence + any USE phrases containing the known_text
      const key = `${lego.seed_number}:${legoIndex}`
      const usePhrases = (usePhraseMap[key] || []).filter(p => textContainsKnown(p))
      const seedValid = textContainsKnown(seedText)

      // Weighted random pick: ~60% USE phrase, ~25% seed, ~15% no context
      // If no USE phrases available, redistribute: ~70% seed, ~30% no context
      const roll = deterministicRand(lego.lego_id)
      let contextText = null
      let contextSource = 'none'

      if (usePhrases.length > 0 && seedValid) {
        // Full pool available
        if (roll < 0.60) {
          // Pick a USE phrase deterministically
          const useIdx = Math.floor(deterministicRand(lego.lego_id + ':use') * usePhrases.length)
          contextText = usePhrases[useIdx]
          contextSource = 'use_phrase'
          contextFromUse++
        } else if (roll < 0.85) {
          contextText = seedText
          contextSource = 'seed'
          contextFromSeed++
        } else {
          contextNone++
        }
      } else if (usePhrases.length > 0) {
        // Only USE phrases (seed doesn't contain known_text)
        if (roll < 0.80) {
          const useIdx = Math.floor(deterministicRand(lego.lego_id + ':use') * usePhrases.length)
          contextText = usePhrases[useIdx]
          contextSource = 'use_phrase'
          contextFromUse++
        } else {
          contextNone++
        }
      } else if (seedValid) {
        // Only seed available
        if (roll < 0.70) {
          contextText = seedText
          contextSource = 'seed'
          contextFromSeed++
        } else {
          contextNone++
        }
      } else {
        // Nothing contains the known_text — no context possible
        contextNone++
      }

      // Skip context if the known text overlaps too much with it (redundant/verbose)
      // e.g. known="I'm happy with how much I've done" context="I'm happy with how much I've done in a short time."
      if (contextText && lego.known_text.length > 0) {
        const overlapRatio = lego.known_text.length / contextText.length
        if (overlapRatio > 0.5) {
          contextText = null
          contextSource = 'none_overlap'
          contextNone++
        }
      }

      const finalTemplate = contextText ? template : shortTemplate

      // For slash-compound known_text like "to listen / to hear", use first option only
      const knownForPresentation = lego.known_text.includes(' / ')
        ? lego.known_text.split(' / ')[0].trim()
        : lego.known_text

      // Fill in template
      let presText = finalTemplate
        .replace('{target_lang_name}', targetLangName)
        .replace('{known}', knownForPresentation)
        .replace('{seed}', contextText || '')

      presentations.push({
        lego_id: lego.lego_id,
        known: lego.known_text,
        target: lego.target_text,
        seed: contextText || '',
        seed_number: lego.seed_number,
        lego_index: legoIndex,
        uses_short_template: !contextText,
        context_source: contextSource,
        presentation_text: presText
      })
    }

    logger.info(`Context sources: ${contextFromSeed} seed, ${contextFromUse} USE phrase, ${contextNone} no context`)

    const contextStats = {
      fromSeed: contextFromSeed,
      fromUsePhrase: contextFromUse,
      noContext: contextNone,
      fullForm: presentations.filter(p => !p.uses_short_template).length,
      shortForm: presentations.filter(p => p.uses_short_template).length
    }

    // =========================================================================
    // COMPONENT PRESENTATIONS - Generate presentation text for M-LEGO components
    // =========================================================================
    const componentPresentations = []

    // Load all component phrases for this course
    const compPhrases = []
    let compOffset = 0
    let hasMoreComps = true
    while (hasMoreComps) {
      const { data: compBatch, error: compError } = await supabase
        .from('course_practice_phrases')
        .select('id, seed_number, lego_index, known_text, target_text')
        .eq('course_code', courseCode)
        .eq('phrase_role', 'component')
        .order('id')
        .range(compOffset, compOffset + PAGE_SIZE - 1)

      if (compError) { logger.warn('Failed to fetch component phrases:', compError.message); break }
      if (compBatch && compBatch.length > 0) {
        compPhrases.push(...compBatch)
        hasMoreComps = compBatch.length === PAGE_SIZE
        compOffset += PAGE_SIZE
      } else {
        hasMoreComps = false
      }
    }

    if (compPhrases.length > 0) {
      // Load parent M-LEGOs for "as in" context
      const compSeedNumbers = [...new Set(compPhrases.map(c => c.seed_number))]
      const parentLegoMap = new Map()

      const COMP_SEED_BATCH = 500
      for (let i = 0; i < compSeedNumbers.length; i += COMP_SEED_BATCH) {
        const seedBatch = compSeedNumbers.slice(i, i + COMP_SEED_BATCH)
        const { data: parentLegos } = await supabase
          .from('course_legos')
          .select('seed_number, lego_index, known_text, target_text')
          .eq('course_code', courseCode)
          .eq('type', 'M')
          .in('seed_number', seedBatch)

        for (const l of (parentLegos || [])) {
          parentLegoMap.set(`${l.seed_number}:${l.lego_index}`, l)
        }
      }

      // Generate presentation text for each component
      for (const comp of compPhrases) {
        const parent = parentLegoMap.get(`${comp.seed_number}:${comp.lego_index}`)
        if (!parent) continue  // Skip components without a parent M-LEGO

        const presText = template
          .replace('{target_lang_name}', targetLangName)
          .replace('{known}', comp.known_text)
          .replace('{seed}', parent.known_text)

        componentPresentations.push({
          phrase_id: comp.id,
          known: comp.known_text,
          target: comp.target_text,
          parent_known: parent.known_text,
          seed_number: comp.seed_number,
          lego_index: comp.lego_index,
          presentation_text: presText
        })
      }

      logger.info(`Generated ${componentPresentations.length} component presentations (from ${compPhrases.length} component phrases)`)
    } else {
      logger.info('No component phrases found for this course')
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
        componentCount: componentPresentations.length,
        contextStats,
        sample: presentations.slice(0, 10),  // Show first 10 LEGO presentations
        componentSample: componentPresentations.slice(0, 5)  // Show first 5 component presentations
      })
    }

    // Bulk upsert presentation text to course_audio
    const voiceConfig = course.voice_config || {}
    const presentationVoiceId = voiceConfig.voices?.presentation?.voiceId || voiceConfig.presentation || 'azure_en-GB-SoniaNeural'

    const BATCH_SIZE = 200
    const legoIdList = presentations.map(p => p.lego_id)

    // Fetch existing presentation audio to detect text changes
    // (If text changed, we must delete the old record so the new one isn't a duplicate)
    const existingByLegoId = new Map()
    for (let i = 0; i < legoIdList.length; i += BATCH_SIZE) {
      const batch = legoIdList.slice(i, i + BATCH_SIZE)
      const { data: existing } = await supabase
        .from('course_audio')
        .select('id, lego_id, text_normalized, s3_key')
        .eq('course_code', courseCode)
        .eq('role', 'presentation')
        .in('lego_id', batch)
      if (existing) {
        for (const rec of existing) existingByLegoId.set(rec.lego_id, rec)
      }
    }

    // Delete records where text changed (otherwise upsert creates duplicates)
    const idsToDelete = []
    const unchangedLegoIds = new Set()
    for (const pres of presentations) {
      const existing = existingByLegoId.get(pres.lego_id)
      if (!existing) continue
      const newNorm = normalizeForAudio(pres.presentation_text)
      if (existing.text_normalized === newNorm) {
        unchangedLegoIds.add(pres.lego_id)  // text same → keep existing record
      } else {
        idsToDelete.push(existing.id)  // text changed → delete old, insert new
      }
    }

    if (idsToDelete.length > 0) {
      // Collect lego_ids of records being deleted
      const deletedLegoIds = []
      for (const pres of presentations) {
        const existing = existingByLegoId.get(pres.lego_id)
        if (existing && idsToDelete.includes(existing.id)) {
          deletedLegoIds.push(pres.lego_id)
        }
      }
      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE)
        await supabase.from('course_audio').delete().in('id', batch)
      }
      // Clear presentation_audio_id so plan/generate picks up the new pending records
      for (const legoId of deletedLegoIds) {
        const m = legoId.match(/S(\d+)L(\d+)/)
        if (!m) continue
        await supabase.from('course_legos')
          .update({ presentation_audio_id: null })
          .eq('course_code', courseCode)
          .eq('seed_number', parseInt(m[1], 10))
          .eq('lego_index', parseInt(m[2], 10))
      }
      logger.info(`Deleted ${idsToDelete.length} stale presentation records, cleared ${deletedLegoIds.length} presentation_audio_id links`)
    }
    logger.info(`Keeping ${unchangedLegoIds.size} unchanged presentation records`)

    // Clean up orphan presentation records with null lego_id (legacy records from before lego_id was set)
    // These can't be matched by the lego_id lookup above, so we delete any that don't match a current text
    const allNewTextsNorm = new Set(presentations.map(p => normalizeForAudio(p.presentation_text)))
    // Also include component presentation texts so we don't accidentally delete those
    const allCompTextsNorm = new Set(componentPresentations.map(cp => normalizeForAudio(cp.presentation_text)))

    let orphanIds = []
    let orphanOffset = 0
    while (true) {
      const { data: orphanBatch } = await supabase
        .from('course_audio')
        .select('id, text_normalized')
        .eq('course_code', courseCode)
        .eq('role', 'presentation')
        .is('lego_id', null)
        .range(orphanOffset, orphanOffset + 999)
      if (!orphanBatch || orphanBatch.length === 0) break
      for (const rec of orphanBatch) {
        if (!allNewTextsNorm.has(rec.text_normalized) && !allCompTextsNorm.has(rec.text_normalized)) {
          orphanIds.push(rec.id)
        }
      }
      if (orphanBatch.length < 1000) break
      orphanOffset += 1000
    }

    if (orphanIds.length > 0) {
      for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
        const batch = orphanIds.slice(i, i + BATCH_SIZE)
        await supabase.from('course_audio').delete().in('id', batch)
      }
      logger.info(`Deleted ${orphanIds.length} orphan presentation records (null lego_id, text no longer matches)`)
    }

    // Build records for bulk upsert (skip unchanged — their records already exist)
    const audioRecords = presentations
      .filter(pres => !unchangedLegoIds.has(pres.lego_id))
      .map(pres => ({
        course_code: courseCode,
        text: pres.presentation_text,
        text_normalized: normalizeForAudio(pres.presentation_text),
        language: knownLang,
        role: 'presentation',
        voice_id: presentationVoiceId,
        origin: 'tts',
        s3_key: `pending/${uuidv4().toUpperCase()}.mp3`,
        lego_id: pres.lego_id  // Store directly - no regex parsing needed later
      }))

    // Bulk upsert - ignore conflicts (existing records stay as-is)
    const { error: audioError } = await supabase
      .from('course_audio')
      .upsert(audioRecords, {
        onConflict: 'course_code,text_normalized,language,role',
        ignoreDuplicates: true
      })

    if (audioError) {
      logger.error('Bulk audio upsert error:', audioError)
      return res.status(500).json({ error: audioError.message })
    }

    logger.info(`Upserted ${audioRecords.length} presentation texts`)

    // Populate course_legos.presentation_audio_id using lego_id (reliable, no query size limits)
    // Only link non-pending audio (pending = text placeholder, no actual audio yet)
    let allPresAudio = []
    for (let i = 0; i < legoIdList.length; i += BATCH_SIZE) {
      const batch = legoIdList.slice(i, i + BATCH_SIZE)
      const { data: batchData, error: batchError } = await supabase
        .from('course_audio')
        .select('id, lego_id, s3_key')
        .eq('course_code', courseCode)
        .eq('role', 'presentation')
        .in('lego_id', batch)

      if (batchError) {
        logger.warn(`Batch query error at offset ${i}:`, batchError.message)
      } else if (batchData) {
        // Filter pending/ s3_keys client-side
        allPresAudio = allPresAudio.concat(batchData.filter(a => !a.s3_key || !a.s3_key.startsWith('pending/')))
      }
    }

    // For LEGOs that share identical presentation text (e.g. two LEGOs both meaning "so"),
    // the upsert with ignoreDuplicates skips the second record. Find these and link them
    // to the existing audio record by text match.
    const linkedLegoIds = new Set(allPresAudio.map(a => a.lego_id))
    const unlinkedPres = presentations.filter(p => !linkedLegoIds.has(p.lego_id) && !unchangedLegoIds.has(p.lego_id))
    if (unlinkedPres.length > 0) {
      logger.info(`${unlinkedPres.length} LEGOs have duplicate presentation text — linking to shared audio records`)
      const normToPresMap = new Map()
      for (const p of unlinkedPres) {
        normToPresMap.set(normalizeForAudio(p.presentation_text), p)
      }
      const norms = [...normToPresMap.keys()]
      for (let i = 0; i < norms.length; i += BATCH_SIZE) {
        const batch = norms.slice(i, i + BATCH_SIZE)
        const { data: matchedAudio } = await supabase
          .from('course_audio')
          .select('id, text_normalized, s3_key')
          .eq('course_code', courseCode)
          .eq('role', 'presentation')
          .in('text_normalized', batch)
        if (matchedAudio) {
          for (const audio of matchedAudio) {
            if (audio.s3_key && !audio.s3_key.startsWith('pending/')) {
              // Find all unlinked LEGOs with this text
              for (const p of unlinkedPres) {
                if (normalizeForAudio(p.presentation_text) === audio.text_normalized) {
                  allPresAudio.push({ id: audio.id, lego_id: p.lego_id, s3_key: audio.s3_key })
                }
              }
            }
          }
        }
      }
    }

    if (allPresAudio.length > 0) {
      // Build lego_id -> course_audio.id map
      const legoToAudioId = new Map()
      for (const audio of allPresAudio) {
        legoToAudioId.set(audio.lego_id, audio.id)
      }

      // Update course_legos.presentation_audio_id
      let legoUpdates = 0
      for (const pres of presentations) {
        const audioId = legoToAudioId.get(pres.lego_id)
        if (!audioId) continue

        const legoMatch = pres.lego_id.match(/S(\d+)L(\d+)/)
        if (!legoMatch) continue

        const seedNumber = parseInt(legoMatch[1], 10)
        const legoIndex = parseInt(legoMatch[2], 10)

        const { error: updateError } = await supabase
          .from('course_legos')
          .update({ presentation_audio_id: audioId })
          .eq('course_code', courseCode)
          .eq('seed_number', seedNumber)
          .eq('lego_index', legoIndex)

        if (!updateError) legoUpdates++
      }
      logger.info(`Updated ${legoUpdates} course_legos.presentation_audio_id records`)

      // Also populate lego_introductions for legacy compat
      const introRecords = presentations
        .filter(p => legoToAudioId.has(p.lego_id))
        .map(p => ({
          course_code: courseCode,
          lego_id: p.lego_id,
          presentation_audio_id: legoToAudioId.get(p.lego_id),
          audio_uuid: legoToAudioId.get(p.lego_id)
        }))

      if (introRecords.length > 0) {
        const { error: introError } = await supabase
          .from('lego_introductions')
          .upsert(introRecords, {
            onConflict: 'course_code,lego_id',
            ignoreDuplicates: false
          })
        if (introError) {
          logger.warn('Could not upsert lego_introductions:', introError.message)
        } else {
          logger.info(`Populated ${introRecords.length} lego_introductions records`)
        }
      }
    } else {
      logger.warn('No presentation audio found to link after upsert')
    }

    // =========================================================================
    // COMPONENT PRESENTATION UPSERT
    // =========================================================================
    let compNewRecords = 0
    let compTextChanged = 0
    let compTextUnchanged = 0

    if (componentPresentations.length > 0) {
      // Fetch existing component presentation audio by text match
      const compPhraseIds = componentPresentations.map(cp => cp.phrase_id)
      const existingByPhraseId = new Map()

      // Component presentations don't have lego_id — match by text_normalized + role
      const compTextsNorm = componentPresentations.map(cp => normalizeForAudio(cp.presentation_text))
      const uniqueCompTexts = [...new Set(compTextsNorm)]

      for (let i = 0; i < uniqueCompTexts.length; i += BATCH_SIZE) {
        const batch = uniqueCompTexts.slice(i, i + BATCH_SIZE)
        const { data: existing } = await supabase
          .from('course_audio')
          .select('id, text_normalized, s3_key')
          .eq('course_code', courseCode)
          .eq('role', 'presentation')
          .in('text_normalized', batch)

        if (existing) {
          for (const rec of existing) existingByPhraseId.set(rec.text_normalized, rec)
        }
      }

      // Build upsert records for component presentations
      const compUnchangedTexts = new Set()
      const compIdsToDelete = []

      for (const cp of componentPresentations) {
        const norm = normalizeForAudio(cp.presentation_text)
        const existing = existingByPhraseId.get(norm)
        if (existing) {
          // Text already exists — mark as unchanged
          compUnchangedTexts.add(norm)
          compTextUnchanged++
        }
      }

      // Build new records (skip ones that already exist with same text)
      const compAudioRecords = componentPresentations
        .filter(cp => !compUnchangedTexts.has(normalizeForAudio(cp.presentation_text)))
        .map(cp => ({
          course_code: courseCode,
          text: cp.presentation_text,
          text_normalized: normalizeForAudio(cp.presentation_text),
          language: knownLang,
          role: 'presentation',
          voice_id: presentationVoiceId,
          origin: 'tts',
          s3_key: `pending/${uuidv4().toUpperCase()}.mp3`
        }))

      compNewRecords = compAudioRecords.length

      if (compAudioRecords.length > 0) {
        const { error: compAudioError } = await supabase
          .from('course_audio')
          .upsert(compAudioRecords, {
            onConflict: 'course_code,text_normalized,language,role',
            ignoreDuplicates: true
          })

        if (compAudioError) {
          logger.error('Component presentation upsert error:', compAudioError)
        } else {
          logger.info(`Upserted ${compAudioRecords.length} component presentation texts`)
        }
      }

      // Link component presentation_audio_id on course_practice_phrases
      // Fetch all presentation audio for this course that match component texts
      const compPresAudioMap = new Map() // text_normalized -> course_audio.id
      // Use small batches — long presentation texts can exceed PostgREST URL limits with .in()
      const COMP_BATCH = 50
      for (let i = 0; i < uniqueCompTexts.length; i += COMP_BATCH) {
        const batch = uniqueCompTexts.slice(i, i + COMP_BATCH)
        const { data: presAudio, error: presErr } = await supabase
          .from('course_audio')
          .select('id, text_normalized, s3_key')
          .eq('course_code', courseCode)
          .eq('role', 'presentation')
          .eq('language', knownLang)
          .in('text_normalized', batch)

        if (presErr) {
          logger.error(`Component pres audio lookup error (batch ${i}): ${presErr.message}`)
          continue
        }

        for (const a of (presAudio || [])) {
          if (!a.s3_key || !a.s3_key.startsWith('pending/')) {
            compPresAudioMap.set(a.text_normalized, a.id)
          }
        }
      }

      // Update presentation_audio_id on matching component phrases
      logger.info(`Component linking: ${compPresAudioMap.size} mastered audio entries, ${componentPresentations.length} components to link`)
      let compLinked = 0
      for (const cp of componentPresentations) {
        const norm = normalizeForAudio(cp.presentation_text)
        const audioId = compPresAudioMap.get(norm)
        if (!audioId) continue

        const { error: linkError } = await supabase
          .from('course_practice_phrases')
          .update({ presentation_audio_id: audioId })
          .eq('id', cp.phrase_id)

        if (!linkError) compLinked++
      }
      if (compLinked > 0) {
        logger.info(`Linked ${compLinked} component presentation_audio_id records`)
      }
    }

    // Bust production-api stats cache so dashboard refreshes
    try {
      await fetch(`http://localhost:3470/api/production/${courseCode}/audio-stats?fresh=1`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
    } catch (e) { /* production-api may not be running */ }

    await bumpCourseVersion(supabase, courseCode, 'patch')

    res.json({
      success: true,
      dryRun: false,
      courseCode,
      template,
      targetLangName,
      total: presentations.length,
      componentTotal: componentPresentations.length,
      textChanged: idsToDelete.length,
      textUnchanged: unchangedLegoIds.size,
      newRecords: audioRecords.length,
      componentNewRecords: compNewRecords,
      componentUnchanged: compTextUnchanged,
      contextStats,
      message: `${presentations.length} LEGO presentations processed (${idsToDelete.length} text changed, ${unchangedLegoIds.size} unchanged, ${presentations.length - idsToDelete.length - unchangedLegoIds.size} new). ${componentPresentations.length} component presentations processed (${compNewRecords} new, ${compTextUnchanged} unchanged). Run regenerate-role with role=presentation to generate audio.`
    })

    emitProgress(supabase, courseCode, `Presentation text regenerated: ${presentations.length} LEGOs, ${componentPresentations.length} components — ready for audio generation`, { phase: 'audio', action: 'regenerate-presentations', legos: presentations.length, components: componentPresentations.length })

  } catch (error) {
    logger.error('Regenerate presentations error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST LINK-AUDIO-IDS - Link audio IDs directly to phrases/legos/seeds
// =============================================================================
// After audio generation, this populates the *_audio_id columns for direct joins
// This eliminates text-matching fragility in the cycle views
// =============================================================================

app.post('/link-audio-ids/:courseCode', async (req, res) => {
  const { courseCode } = req.params
  const { dryRun = false } = req.body

  logger.info(`Link audio IDs request for: ${courseCode} (dryRun: ${dryRun})`)

  try {
    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('course_code, known_lang, target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` })
    }

    const results = {
      practice_phrases: { known: 0, target1: 0, target2: 0 },
      legos: { known: 0, target1: 0, target2: 0 },
      seeds: { known: 0, target1: 0, target2: 0 }
    }

    if (dryRun) {
      // Just count what would be updated
      const { count: ppKnown } = await supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .is('known_audio_id', null)

      const { count: ppTarget1 } = await supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .is('target1_audio_id', null)

      const { count: legoKnown } = await supabase
        .from('course_legos')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .is('known_audio_id', null)

      return res.json({
        success: true,
        dryRun: true,
        courseCode,
        wouldUpdate: {
          practice_phrases_missing_known: ppKnown || 0,
          practice_phrases_missing_target1: ppTarget1 || 0,
          legos_missing_known: legoKnown || 0
        },
        message: 'Use dryRun: false to execute'
      })
    }

    const linkResults = await linkAudioIds(courseCode)

    logger.info(`Linked ${linkResults.total} audio IDs for ${courseCode}`)

    res.json({
      success: true,
      dryRun: false,
      courseCode,
      results: linkResults,
      totalLinked: linkResults.total,
      message: `Linked ${linkResults.total} audio IDs`
    })

  } catch (error) {
    logger.error('Link audio IDs error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST LINK-PRESENTATION-AUDIO - Standalone endpoint to fix presentation linking
// =============================================================================
app.post('/link-presentation-audio/:courseCode', async (req, res) => {
  const { courseCode } = req.params
  try {
    const result = await linkPresentationAudio(courseCode)
    res.json({ success: true, courseCode, ...result })
  } catch (error) {
    logger.error('Link presentation audio error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST REGENERATE-SINGLE - Regenerate a single audio file by UUID
// =============================================================================

app.post('/regenerate-single/:courseCode/:audioUuid', async (req, res) => {
  try {
    const { courseCode, audioUuid } = req.params

    // 1. Lookup the course_audio record
    const { data: audioRecord, error: audioError } = await supabase
      .from('course_audio')
      .select('id, text, role, language, voice_id, s3_key')
      .eq('id', audioUuid)
      .eq('course_code', courseCode)
      .single()

    if (audioError || !audioRecord) {
      return res.status(404).json({ error: `Audio not found: ${audioUuid} in ${courseCode}` })
    }

    // 2. Get course voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('voice_config, known_lang, target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const { role, text, language } = audioRecord
    const voiceConfig = course.voice_config || {}
    const voiceSettings = voiceConfig.voices?.[role] || {}
    const voiceId = voiceSettings.voiceId || voiceConfig[role]
    const voiceProvider = voiceSettings.provider || 'azure'
    const speed = voiceSettings.settings?.speed || 1.0

    if (!voiceId) {
      return res.status(400).json({ error: `No voice configured for role: ${role}` })
    }

    // 3. Get regen_count from audio_flags (default 0 if no flag exists)
    const { data: flagRecord } = await supabase
      .from('audio_flags')
      .select('regen_count')
      .eq('audio_uuid', audioUuid)
      .eq('course_code', courseCode)
      .maybeSingle()

    const regenCount = flagRecord?.regen_count || 0

    // 4. Gender expansion
    let textForTTS = text
    const lang = language || (role === 'known' ? course.known_lang : course.target_lang)
    if ((role === 'target1' || role === 'target2') && genderHaikuService.GENDERED_LANGUAGES.includes(lang)) {
      // Try Haiku gender expansion
      try {
        const result = await genderHaikuService.expandGender(text, lang, role)
        if (result?.wasModified) {
          textForTTS = result.expandedText
          logger.info(`Gender: "${text}" → "${textForTTS}" (${role})`)
        }
      } catch (e) {
        logger.warn(`Gender expansion failed, using original text: ${e.message}`)
      }
    }
    // Fallback: marker-based expansion
    if (textForTTS === text && (role === 'target1' || role === 'target2') && genderService.hasGenderMarker(text)) {
      const markerResult = genderService.analyzeAndExpand(text, lang, role)
      if (markerResult.wasModified) {
        textForTTS = markerResult.expandedText
        logger.info(`Gender (marker): "${text}" → "${textForTTS}" (${role})`)
      }
    }

    // 5. TTS generate
    logger.info(`[Regen Single] "${text.substring(0, 40)}..." role=${role} voice=${voiceId} attempt=${regenCount}`)

    let rawAudioBuffer, wordBoundaries
    if (voiceProvider === 'azure') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION || 'westeurope',
        voiceName: voiceId,
        speed,
        regenerationAttempt: regenCount
      }))
    } else if (voiceProvider === 'elevenlabs') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: voiceId,
        speed
      }))
    } else if (voiceProvider === 'xai') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
        apiKey: process.env.XAI_API_KEY,
        voiceId: voiceId,
        language: toBcp47(lang),
      }))
    } else {
      throw new Error(`Unknown TTS provider: ${voiceProvider}`)
    }

    // 6. Master audio
    const { buffer: masteredBuffer, durationMs } = await masterAudio(rawAudioBuffer)

    // 7. Upload to S3
    const newAudioId = uuidv4().toUpperCase()
    const newS3Key = `mastered/${newAudioId}.mp3`

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: newS3Key,
      Body: masteredBuffer,
      ContentType: 'audio/mpeg'
    }))

    // 8. Update course_audio record
    const { error: updateError } = await supabase
      .from('course_audio')
      .update({
        voice_id: voiceId,
        origin: 'tts',
        s3_key: newS3Key,
        duration_ms: durationMs,
        word_boundaries: wordBoundaries || null
      })
      .eq('id', audioUuid)

    if (updateError) throw updateError

    // 9. Update or create audio_flags with incremented regen_count
    if (flagRecord) {
      // Flag exists — just bump regen_count
      const { error: flagError } = await supabase
        .from('audio_flags')
        .update({ regen_count: regenCount + 1 })
        .eq('audio_uuid', audioUuid)
        .eq('course_code', courseCode)
      if (flagError) logger.warn(`Failed to update regen_count: ${flagError.message}`)
    } else {
      // No flag yet — create one
      const { error: flagError } = await supabase
        .from('audio_flags')
        .insert({
          audio_uuid: audioUuid,
          course_code: courseCode,
          status: 'flagged',
          regen_count: 1,
          reason: 'Inline regeneration',
          flagged_by: 'dashboard_user',
          created_at: new Date().toISOString()
        })
      if (flagError) logger.warn(`Failed to create audio flag: ${flagError.message}`)
    }

    logger.info(`[Regen Single] Done: "${text.substring(0, 30)}..." → ${newS3Key} (${durationMs}ms)`)

    res.json({
      success: true,
      audioUuid,
      newS3Key,
      durationMs,
      regenCount: regenCount + 1
    })

  } catch (error) {
    logger.error('Regenerate single error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST GENERATE-COMPONENTS - Generate audio for M-LEGO component phrases
// =============================================================================

app.post('/generate-components/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { dryRun = false, concurrency: requestedConcurrency } = req.body

    const concurrencyToUse = requestedConcurrency
      ? Math.max(1, Math.min(20, parseInt(requestedConcurrency, 10) || CONCURRENCY))
      : CONCURRENCY

    if (currentWork.active) {
      return res.status(409).json({
        error: 'Another job is already running',
        activeJob: { operation: currentWork.operation, courseCode: currentWork.courseCode }
      })
    }

    // 1. Load course + voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const voiceConfig = course.voice_config || {}
    const voices = voiceConfig.voices || voiceConfig
    if (!voices.known || !voices.target1) {
      return res.status(400).json({ error: 'Course missing voice configuration', voiceConfig })
    }

    const getVoiceForRole = (role) => {
      const v = voices[role]
      if (!v) return null
      const provider = v.provider || 'azure'
      if (v.voiceId) return `${provider}_${v.voiceId}`
      return v
    }
    const getSpeedForRole = (role) => voices[role]?.settings?.speed || 1.0

    const knownLang = course.known_lang
    const targetLang = course.target_lang
    const targetLangName = getLocalisedLangName(targetLang, knownLang)

    // 2. Load component phrases
    const { data: components, error: compError } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
      .eq('course_code', courseCode)
      .eq('phrase_role', 'component')
      .order('seed_number')
      .order('lego_index')

    if (compError) throw compError
    if (!components?.length) {
      return res.json({ success: true, message: 'No component phrases found', count: 0 })
    }

    logger.info(`[Components] Found ${components.length} component phrases for ${courseCode}`)

    // 3. Load parent M-LEGOs for presentation context
    const parentKeys = [...new Set(components.map(c => `${c.seed_number}:${c.lego_index}`))]
    const parentSeedNumbers = [...new Set(components.map(c => c.seed_number))]
    const parentLegoIndices = [...new Set(components.map(c => c.lego_index))]

    const { data: parentLegos } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text')
      .eq('course_code', courseCode)
      .eq('type', 'M')
      .in('seed_number', parentSeedNumbers)

    const parentMap = new Map()
    for (const l of (parentLegos || [])) {
      parentMap.set(`${l.seed_number}:${l.lego_index}`, l)
    }

    // 4. Get (or auto-generate) presentation template
    const presentationTemplate = await getOrCreatePresentationTemplate(knownLang)

    // 5. Collect all unique texts we need audio for
    const needed = []
    const compPresTexts = new Map() // comp.id -> presentation text

    for (const comp of components) {
      const parent = parentMap.get(`${comp.seed_number}:${comp.lego_index}`)

      // known audio
      if (!isPunctuationOnly(comp.known_text)) {
        needed.push({
          text: comp.known_text,
          language: knownLang,
          role: 'known',
          voiceId: getVoiceForRole('known'),
          speed: getSpeedForRole('known'),
          componentId: comp.id
        })
      }

      // target1 + target2 audio
      if (!isPunctuationOnly(comp.target_text)) {
        for (const role of ['target1', 'target2']) {
          needed.push({
            text: comp.target_text,
            language: targetLang,
            role,
            voiceId: getVoiceForRole(role),
            speed: getSpeedForRole(role),
            componentId: comp.id
          })
        }
      }

      // presentation audio
      if (parent) {
        const presText = presentationTemplate
          .replace('{target_lang_name}', targetLangName)
          .replace('{known}', comp.known_text)
          .replace('{seed}', parent.known_text)

        compPresTexts.set(comp.id, presText)

        needed.push({
          text: presText,
          language: knownLang,
          role: 'presentation',
          voiceId: getVoiceForRole('presentation') || getVoiceForRole('known'),
          speed: getSpeedForRole('presentation') || getSpeedForRole('known') || 1.0,
          componentId: comp.id,
          isComponentPresentation: true
        })
      }
    }

    // 6. Dedup against existing course_audio (targeted query by unique texts)
    const uniqueTexts = [...new Set(needed.map(n => normalizeText(n.text)))]

    // Query existing audio in batches of 200 texts
    const existingSet = new Set()
    const TEXT_BATCH = 200
    for (let i = 0; i < uniqueTexts.length; i += TEXT_BATCH) {
      const batch = uniqueTexts.slice(i, i + TEXT_BATCH)
      const { data: existing } = await supabase
        .from('course_audio')
        .select('text_normalized, language, role, s3_key')
        .eq('course_code', courseCode)
        .in('text_normalized', batch)

      for (const a of (existing || [])) {
        if (!a.s3_key || !a.s3_key.startsWith('pending/')) {
          existingSet.add(`${normalizeText(a.text_normalized)}|${a.language}|${a.role}`)
        }
      }
    }

    // Also check sibling courses for cross-course sharing candidates
    // (the generateItem function handles actual sharing, this is just for counting)

    // Filter out items that already have audio
    const missing = needed.filter(n => {
      const key = `${normalizeText(n.text)}|${n.language}|${n.role}`
      return !existingSet.has(key)
    })

    // Deduplicate by text|language|role
    const uniqueNeeded = [...new Map(
      missing.map(n => [`${n.text}|${n.language}|${n.role}`, n])
    ).values()]

    logger.info(`[Components] ${needed.length} total needed, ${existingSet.size} already exist, ${uniqueNeeded.length} to generate`)

    // Breakdown by role
    const byRole = {}
    for (const n of uniqueNeeded) {
      byRole[n.role] = (byRole[n.role] || 0) + 1
    }
    logger.info(`[Components] By role: ${JSON.stringify(byRole)}`)

    if (dryRun) {
      return res.json({
        dryRun: true,
        courseCode,
        totalComponents: components.length,
        alreadyHaveAudio: existingSet.size,
        wouldGenerate: uniqueNeeded.length,
        byRole,
        samples: uniqueNeeded.slice(0, 15).map(n => ({
          text: n.text.substring(0, 80),
          role: n.role,
          language: n.language
        }))
      })
    }

    if (uniqueNeeded.length === 0) {
      // Nothing to generate — just link existing audio
      const linkResult = await linkComponentAudio(courseCode, knownLang, targetLang, components, compPresTexts)
      return res.json({
        status: 'completed',
        courseCode,
        generated: 0,
        message: 'All component audio already exists',
        linked: linkResult
      })
    }

    // 7. Start generation
    startWork('generate-components', courseCode, uniqueNeeded.length)

    // Load gender expansions if needed
    let genderMap = new Map()
    if (genderHaikuService.GENDERED_LANGUAGES.includes(targetLang)) {
      genderMap = await genderHaikuService.loadGenderMap(courseCode, supabase)
      logger.info(`Loaded ${genderMap.size} gender expansions from DB`)
    }

    const results = { success: 0, failed: 0, errors: [] }

    // Generate items using the same pattern as /generate
    const generateItem = async (item) => {
      // Cross-course sharing
      try {
        const { data: siblingAudio } = await supabase
          .from('course_audio')
          .select('s3_key, duration_ms, word_boundaries')
          .neq('course_code', courseCode)
          .eq('text_normalized', normalizeForAudio(item.text))
          .eq('language', item.language)
          .eq('role', item.role)
          .eq('voice_id', item.voiceId)
          .not('s3_key', 'like', 'pending/%')
          .limit(1)
          .single()

        if (siblingAudio?.s3_key) {
          const { data: insertedAudio, error: insertError } = await supabase
            .from('course_audio')
            .upsert({
              course_code: courseCode,
              text: item.text,
              text_normalized: normalizeForAudio(item.text),
              language: item.language,
              role: item.role,
              voice_id: item.voiceId,
              origin: 'tts',
              s3_key: siblingAudio.s3_key,
              duration_ms: siblingAudio.duration_ms,
              word_boundaries: siblingAudio.word_boundaries || null
            }, {
              onConflict: 'course_code,text_normalized,language,role'
            })
            .select('id')
            .single()

          if (!insertError && insertedAudio) {
            updateWork(item.text, true)
            logger.info(`Shared: ${item.role} - "${item.text.substring(0, 40)}..." (sibling)`)
            return { success: true, item, shared: true }
          }
        }
      } catch (e) {
        // Fall through to TTS generation
      }

      // TTS generation
      const [provider, voiceName] = item.voiceId.split('_', 2)
      const speed = item.speed || 1.0

      // Gender expansion
      let textForTTS = item.text
      const genderKey = `${item.text}|${item.language}|${item.role}`
      const genderResult = genderMap.get(genderKey)
      if (genderResult?.wasModified) {
        textForTTS = genderResult.expandedText
      } else if ((item.role === 'target1' || item.role === 'target2') && genderService.hasGenderMarker(item.text)) {
        const markerResult = genderService.analyzeAndExpand(item.text, item.language, item.role)
        if (markerResult.wasModified) textForTTS = markerResult.expandedText
      }

      let rawAudioBuffer, wordBoundaries
      if (provider === 'azure') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName, speed
        }))
      } else if (provider === 'elevenlabs') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceName, speed
        }))
      } else if (provider === 'xai') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
          apiKey: process.env.XAI_API_KEY,
          voiceId: voiceName,
          language: toBcp47(item.language),
        }))
      } else {
        throw new Error(`Unknown TTS provider: ${provider}`)
      }

      const { buffer: masteredBuffer, durationMs } = await masterAudio(rawAudioBuffer)

      const audioId = uuidv4().toUpperCase()
      const s3Key = `mastered/${audioId}.mp3`

      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: masteredBuffer,
        ContentType: 'audio/mpeg'
      }))

      const { data: insertedAudio, error: insertError } = await supabase
        .from('course_audio')
        .upsert({
          course_code: courseCode,
          text: item.text,
          text_normalized: normalizeForAudio(item.text),
          language: item.language,
          role: item.role,
          voice_id: item.voiceId,
          origin: 'tts',
          s3_key: s3Key,
          duration_ms: durationMs,
          word_boundaries: wordBoundaries || null
        }, {
          onConflict: 'course_code,text_normalized,language,role'
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      updateWork(item.text, true)
      logger.info(`Generated: ${item.role} - "${item.text.substring(0, 30)}..."`)
      return { success: true, item }
    }

    // Process in parallel batches with timeout
    for (let i = 0; i < uniqueNeeded.length; i += concurrencyToUse) {
      if (currentWork.cancelled) break

      const batch = uniqueNeeded.slice(i, i + concurrencyToUse)
      const batchNum = Math.floor(i / concurrencyToUse) + 1
      const totalBatches = Math.ceil(uniqueNeeded.length / concurrencyToUse)
      logger.info(`[Components] Batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      const withTimeout = (fn, ms = 120_000) => Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s`)), ms))
      ])

      const batchResults = await Promise.allSettled(batch.map(item => withTimeout(() => generateItem(item))))

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
        }
      }
    }

    const wasCancelled = currentWork.cancelled
    endWork()

    // 8. Link audio IDs back to component phrases
    let linkResult = {}
    if (!wasCancelled) {
      linkResult = await linkComponentAudio(courseCode, knownLang, targetLang, components, compPresTexts)
    }

    if (!wasCancelled && results.success > 0) {
      await bumpCourseVersion(supabase, courseCode, 'patch')
    }

    res.json({
      status: wasCancelled ? 'cancelled' : 'completed',
      courseCode,
      total: uniqueNeeded.length,
      success: results.success,
      failed: results.failed,
      cancelled: wasCancelled,
      errors: results.errors.slice(0, 10),
      linked: linkResult
    })

  } catch (error) {
    logger.error('Generate components error:', error)
    endWork()
    res.status(500).json({ error: error.message })
  }
})

/**
 * Link audio IDs from course_audio to component phrases
 * Targeted linking — only touches component rows, not all phrases
 */
async function linkComponentAudio(courseCode, knownLang, targetLang, components, compPresTexts) {
  const result = { known: 0, target1: 0, target2: 0, presentation: 0 }

  // Build audio lookup from ALL course_audio for this course
  // Using .in('text_normalized', batch) with long Unicode strings can exceed
  // PostgREST URL length limits, causing silent failures. Instead, fetch all
  // audio for the relevant roles and build the map locally.
  const audioMap = new Map() // "normalized|lang|role" -> course_audio.id

  for (const role of ['known', 'target1', 'target2', 'presentation']) {
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from('course_audio')
        .select('id, text_normalized, language, role, s3_key')
        .eq('course_code', courseCode)
        .eq('role', role)
        .not('s3_key', 'like', 'pending/%')
        .range(offset, offset + 999)
      if (error || !data?.length) break
      for (const a of data) {
        audioMap.set(`${normalizeText(a.text_normalized)}|${a.language}|${a.role}`, a.id)
      }
      if (data.length < 1000) break
      offset += 1000
    }
  }

  logger.info(`[LinkComponents] Audio map has ${audioMap.size} entries`)

  // Update each component phrase
  for (const comp of components) {
    const updates = {}

    const knownAudioId = audioMap.get(`${normalizeText(comp.known_text)}|${knownLang}|known`)
    if (knownAudioId && comp.known_audio_id !== knownAudioId) {
      updates.known_audio_id = knownAudioId
      result.known++
    }

    const t1AudioId = audioMap.get(`${normalizeText(comp.target_text)}|${targetLang}|target1`)
    if (t1AudioId && comp.target1_audio_id !== t1AudioId) {
      updates.target1_audio_id = t1AudioId
      result.target1++
    }

    const t2AudioId = audioMap.get(`${normalizeText(comp.target_text)}|${targetLang}|target2`)
    if (t2AudioId && comp.target2_audio_id !== t2AudioId) {
      updates.target2_audio_id = t2AudioId
      result.target2++
    }

    const presText = compPresTexts.get(comp.id)
    if (presText) {
      const presAudioId = audioMap.get(`${normalizeText(presText)}|${knownLang}|presentation`)
      if (presAudioId && comp.presentation_audio_id !== presAudioId) {
        updates.presentation_audio_id = presAudioId
        result.presentation++
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('course_practice_phrases')
        .update(updates)
        .eq('id', comp.id)
    }
  }

  logger.info(`[LinkComponents] Linked: known=${result.known}, target1=${result.target1}, target2=${result.target2}, presentation=${result.presentation}`)
  return result
}

// =============================================================================
// COMPONENT AUDIO SPLICING — extract component words from parent M-LEGO audio
// =============================================================================

/**
 * Download an audio file from S3 and return as Buffer
 * @param {string} s3Key - S3 key (e.g. "mastered/UUID.mp3")
 * @returns {Promise<Buffer>}
 */
async function downloadFromS3(s3Key) {
  const response = await s3.send(new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key
  }))
  const chunks = []
  for await (const chunk of response.Body) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Find word boundary entries matching component text within parent word boundaries.
 * Handles multi-word components by finding consecutive matching boundaries.
 *
 * @param {string} componentText - The component word/phrase to find (e.g. "speak")
 * @param {Array<{text: string, offset: number, duration: number}>} wordBoundaries - Parent word boundaries
 * @returns {{startMs: number, endMs: number}|null} Start and end timestamps, or null if not found
 */
function findComponentBoundaries(componentText, wordBoundaries) {
  if (!wordBoundaries?.length || !componentText) return null

  const compWords = componentText.trim().toLowerCase().split(/\s+/)

  // Try exact multi-word match first
  for (let i = 0; i <= wordBoundaries.length - compWords.length; i++) {
    let allMatch = true
    for (let j = 0; j < compWords.length; j++) {
      const wbText = wordBoundaries[i + j].text.toLowerCase()
      if (wbText !== compWords[j]) {
        allMatch = false
        break
      }
    }
    if (allMatch) {
      const first = wordBoundaries[i]
      const last = wordBoundaries[i + compWords.length - 1]
      return {
        startMs: first.offset,
        endMs: last.offset + last.duration
      }
    }
  }

  // Fallback: single-word component, try partial match (e.g. punctuation differences)
  if (compWords.length === 1) {
    const target = compWords[0].replace(/[^\p{L}\p{N}]/gu, '')
    for (const wb of wordBoundaries) {
      const wbClean = wb.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
      if (wbClean === target) {
        return { startMs: wb.offset, endMs: wb.offset + wb.duration }
      }
    }
  }

  return null
}

/**
 * Splice a segment from parent audio using ffmpeg.
 * Uses simple volume normalization (not loudnorm) to avoid minimum-duration issues.
 *
 * @param {Buffer} parentAudioBuffer - Full parent audio
 * @param {number} startMs - Start offset in milliseconds
 * @param {number} endMs - End offset in milliseconds
 * @param {number} paddingMs - Padding to add before/after the splice (default 20ms)
 * @returns {Promise<{buffer: Buffer, durationMs: number}>}
 */
async function spliceAudio(parentAudioBuffer, startMs, endMs, paddingMs = 20) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-splice-'))
  const parentPath = path.join(tempDir, 'parent.mp3')
  const splicedPath = path.join(tempDir, 'spliced.mp3')

  try {
    await fs.writeFile(parentPath, parentAudioBuffer)

    // Add padding but don't go below 0
    const actualStart = Math.max(0, startMs - paddingMs)
    const durationMs = (endMs + paddingMs) - actualStart

    // Use ffmpeg to extract segment — simple volume filter instead of loudnorm
    // loudnorm needs ~400ms minimum; component words can be much shorter
    const { exec: execCb } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(execCb)

    await execAsync(
      `ffmpeg -y -i "${parentPath}" -ss ${actualStart}ms -t ${durationMs}ms -q:a 2 "${splicedPath}"`
    )

    // Get actual duration from the spliced file
    const metadata = await audioProcessor.getAudioMetadata(splicedPath)
    const actualDurationMs = Math.round(metadata.duration * 1000)

    const splicedBuffer = await fs.readFile(splicedPath)

    return { buffer: splicedBuffer, durationMs: actualDurationMs }
  } finally {
    await fs.remove(tempDir)
  }
}

/**
 * POST /splice-components/:courseCode
 *
 * For each component phrase missing target1/target2 audio:
 * 1. Find the parent M-LEGO's course_audio record (has word_boundaries)
 * 2. Download the parent audio from S3
 * 3. Find the component word(s) in word_boundaries
 * 4. Splice out the segment with ffmpeg
 * 5. Upload splice to S3, create course_audio record
 * 6. Link audio ID to the component phrase
 */
app.post('/splice-components/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { dryRun = false, roles = ['target1', 'target2'] } = req.body || {}

    if (currentWork.active) {
      return res.status(409).json({
        error: 'Another job is already running',
        activeJob: { operation: currentWork.operation, courseCode: currentWork.courseCode }
      })
    }

    // 1. Load course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('course_code, known_lang, target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const { target_lang: targetLang } = course

    // 2. Load component phrases missing audio for requested roles
    const { data: components, error: compError } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text, target1_audio_id, target2_audio_id')
      .eq('course_code', courseCode)
      .eq('phrase_role', 'component')
      .order('seed_number')
      .order('lego_index')

    if (compError) throw compError
    if (!components?.length) {
      return res.json({ success: true, message: 'No component phrases found', spliced: 0 })
    }

    // Filter to those actually missing audio
    const needsSplice = components.filter(c => {
      if (roles.includes('target1') && !c.target1_audio_id) return true
      if (roles.includes('target2') && !c.target2_audio_id) return true
      return false
    })

    if (!needsSplice.length) {
      return res.json({ success: true, message: 'All component phrases already have audio', spliced: 0 })
    }

    // 3. Load parent M-LEGOs for these components
    const parentSeedNumbers = [...new Set(needsSplice.map(c => c.seed_number))]
    const { data: parentLegos } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, target_text, type')
      .eq('course_code', courseCode)
      .eq('type', 'M')
      .in('seed_number', parentSeedNumbers)

    const parentMap = new Map()
    for (const l of (parentLegos || [])) {
      parentMap.set(`${l.seed_number}:${l.lego_index}`, l)
    }

    // 4. Load parent M-LEGO audio records (with word boundaries)
    const parentTexts = [...new Set([...(parentLegos || [])].map(l => normalizeForAudio(l.target_text)))]

    // Batch query parent audio
    const parentAudioMap = new Map() // normalizedText -> {s3_key, word_boundaries}
    const BATCH = 200
    for (let i = 0; i < parentTexts.length; i += BATCH) {
      const batch = parentTexts.slice(i, i + BATCH)
      for (const role of roles) {
        const { data: audioRows } = await supabase
          .from('course_audio')
          .select('text_normalized, s3_key, word_boundaries')
          .eq('course_code', courseCode)
          .eq('language', targetLang)
          .eq('role', role)
          .not('s3_key', 'like', 'pending/%')
          .not('word_boundaries', 'is', null)
          .in('text_normalized', batch)

        for (const row of (audioRows || [])) {
          parentAudioMap.set(`${row.text_normalized}|${role}`, row)
        }
      }
    }

    // 5. Build splice plan
    const splicePlan = []
    const skipped = { noParent: 0, noParentAudio: 0, noBoundaries: 0, noMatch: 0 }

    for (const comp of needsSplice) {
      const parent = parentMap.get(`${comp.seed_number}:${comp.lego_index}`)
      if (!parent) { skipped.noParent++; continue }

      const parentTextNorm = normalizeForAudio(parent.target_text)

      for (const role of roles) {
        // Skip if this component already has audio for this role
        if (role === 'target1' && comp.target1_audio_id) continue
        if (role === 'target2' && comp.target2_audio_id) continue

        const parentAudio = parentAudioMap.get(`${parentTextNorm}|${role}`)
        if (!parentAudio) { skipped.noParentAudio++; continue }
        if (!parentAudio.word_boundaries?.length) { skipped.noBoundaries++; continue }

        const bounds = findComponentBoundaries(comp.target_text, parentAudio.word_boundaries)
        if (!bounds) { skipped.noMatch++; continue }

        splicePlan.push({
          componentId: comp.id,
          componentText: comp.target_text,
          parentText: parent.target_text,
          parentS3Key: parentAudio.s3_key,
          parentWordBoundaries: parentAudio.word_boundaries,
          role,
          language: targetLang,
          startMs: bounds.startMs,
          endMs: bounds.endMs
        })
      }
    }

    logger.info(`[Splice] Plan: ${splicePlan.length} splices, skipped: ${JSON.stringify(skipped)}`)

    if (dryRun) {
      return res.json({
        dryRun: true,
        courseCode,
        totalComponents: components.length,
        needingSplice: needsSplice.length,
        wouldSplice: splicePlan.length,
        skipped,
        samples: splicePlan.slice(0, 15).map(s => ({
          component: s.componentText,
          parent: s.parentText.substring(0, 60),
          role: s.role,
          startMs: s.startMs,
          endMs: s.endMs,
          durationMs: s.endMs - s.startMs
        }))
      })
    }

    if (!splicePlan.length) {
      return res.json({
        success: true,
        message: 'No spliceable components found',
        spliced: 0,
        skipped
      })
    }

    // 6. Execute splices
    startWork('splice-components', courseCode, splicePlan.length)

    // Cache downloaded parent audio to avoid re-downloading the same file
    const parentAudioCache = new Map() // s3Key -> Buffer
    const results = { success: 0, failed: 0, errors: [] }

    // Process sequentially to manage memory (parent audio files can be large)
    for (const splice of splicePlan) {
      if (currentWork.cancelled) break

      try {
        // Download parent audio (with cache)
        let parentBuffer = parentAudioCache.get(splice.parentS3Key)
        if (!parentBuffer) {
          parentBuffer = await downloadFromS3(splice.parentS3Key)
          parentAudioCache.set(splice.parentS3Key, parentBuffer)
        }

        // Splice out the component
        const { buffer: splicedBuffer, durationMs } = await spliceAudio(
          parentBuffer, splice.startMs, splice.endMs
        )

        // Upload to S3
        const audioId = uuidv4().toUpperCase()
        const s3Key = `mastered/${audioId}.mp3`

        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: splicedBuffer,
          ContentType: 'audio/mpeg'
        }))

        // Insert course_audio record
        const { data: insertedAudio, error: insertError } = await supabase
          .from('course_audio')
          .upsert({
            course_code: courseCode,
            text: splice.componentText,
            text_normalized: normalizeForAudio(splice.componentText),
            language: splice.language,
            role: splice.role,
            voice_id: 'spliced',
            origin: 'tts',
            s3_key: s3Key,
            duration_ms: durationMs
          }, {
            onConflict: 'course_code,text_normalized,language,role'
          })
          .select('id')
          .single()

        if (insertError) throw insertError

        // Link audio ID directly to the component phrase
        const audioCol = splice.role === 'target1' ? 'target1_audio_id' : 'target2_audio_id'
        await supabase
          .from('course_practice_phrases')
          .update({ [audioCol]: insertedAudio.id })
          .eq('id', splice.componentId)

        results.success++
        updateWork(`${splice.componentText} (${splice.role})`, true)
        logger.info(`[Splice] OK: "${splice.componentText}" from "${splice.parentText.substring(0, 30)}..." (${splice.role}, ${durationMs}ms)`)

      } catch (err) {
        results.failed++
        results.errors.push({
          component: splice.componentText,
          parent: splice.parentText.substring(0, 50),
          role: splice.role,
          error: err.message
        })
        updateWork(`${splice.componentText} (${splice.role})`, false, err.message)
        logger.error(`[Splice] FAIL: "${splice.componentText}" - ${err.message}`)
      }
    }

    const wasCancelled = currentWork.cancelled
    endWork()

    if (!wasCancelled && results.success > 0) {
      await bumpCourseVersion(supabase, courseCode, 'patch')
    }

    res.json({
      status: wasCancelled ? 'cancelled' : 'completed',
      courseCode,
      total: splicePlan.length,
      success: results.success,
      failed: results.failed,
      skipped,
      errors: results.errors.slice(0, 20)
    })

  } catch (err) {
    endWork()
    logger.error('[Splice] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// POD AUDIO GENERATION (Layer 2 listening pods)
// =============================================================================
// Uses the same masterAudio + S3 + course_audio pipeline as course audio.
// Pod sentences live in listening_pod_sentences; target audio uses the
// per-pod speaker->voice mapping from listening_pods.speakers, known audio
// uses the course-wide known voice from courses.voice_config.

const POD_CHARS_TO_COST = 4.20 / 1_000_000  // xAI pricing; near-identical to Azure scale, rough estimate

/**
 * Resolve the voice config for a pod sentence's target audio.
 * Returns { voice_id, provider, gender } from pod.speakers for this speaker,
 * falling back to pod.speakers._default, falling back to xAI 'sal'.
 */
function resolvePodSpeakerVoice(podSpeakers, speaker) {
  const mapping = podSpeakers || {}
  return mapping[speaker]
      || mapping._default
      || { voice_id: 'sal', provider: 'xai', gender: 'n' }
}

/**
 * Build the TTS config for a single audio generation call.
 */
function buildPodTTSConfig(voice, language) {
  const base = { voiceId: voice.voice_id, speed: 1.0 }
  if (voice.provider === 'xai') {
    base.apiKey = process.env.XAI_API_KEY
    base.language = toBcp47(language)
  } else if (voice.provider === 'elevenlabs') {
    base.apiKey = process.env.ELEVENLABS_API_KEY
  } else {
    // azure (or unspecified)
    base.subscriptionKey = process.env.AZURE_SPEECH_KEY
    base.region = process.env.AZURE_SPEECH_REGION || 'westeurope'
    base.voiceName = voice.voice_id
  }
  return base
}

/**
 * Look up existing course_audio by (course_code, text_normalized, language, role, voice_id).
 * Returns the audio row's id if a match exists, else null.
 */
async function findExistingAudio(courseCode, text, language, role, voiceId) {
  const textNorm = normalizeForAudio(text)
  const { data, error } = await supabase
    .from('course_audio')
    .select('id')
    .eq('course_code', courseCode)
    .eq('text_normalized', textNorm)
    .eq('language', language)
    .eq('role', role)
    .eq('voice_id', voiceId)
    .limit(1)
  if (error) {
    logger.warn(`[Pod] findExistingAudio: ${error.message}`)
    return null
  }
  return data?.[0]?.id || null
}

/**
 * Generate one audio clip and insert into course_audio. Returns the audio_id.
 */
async function generatePodAudio({ courseCode, text, language, role, voice }) {
  // Reuse by text+voice hash
  const existing = await findExistingAudio(courseCode, text, language, role, voice.voice_id)
  if (existing) return { id: existing, reused: true }

  const ttsConfig = buildPodTTSConfig(voice, language)
  const { audioBuffer } = await ttsService.generateWithRetry(text, voice.provider || 'azure', ttsConfig)
  const { buffer: masteredBuffer, durationMs } = await masterAudio(audioBuffer)

  const audioId = uuidv4().toUpperCase()
  const s3Key = `mastered/${audioId}.mp3`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: masteredBuffer,
    ContentType: 'audio/mpeg',
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('course_audio')
    .upsert({
      course_code: courseCode,
      text,
      text_normalized: normalizeForAudio(text),
      language,
      role,
      voice_id: voice.voice_id,
      origin: 'tts',
      s3_key: s3Key,
      duration_ms: durationMs,
    }, {
      onConflict: 'course_code,text_normalized,language,role',
    })
    .select('id')
    .single()

  if (insertError) throw new Error(`course_audio insert failed: ${insertError.message}`)
  return { id: inserted.id, reused: false, bytes: masteredBuffer.length, chars: text.length }
}

/**
 * Load pod(s) + their sentences for a course. If podIds specified, filter.
 */
async function loadPodsForPlan(courseCode, podIds) {
  let podQuery = supabase.from('listening_pods').select('*').eq('course_code', courseCode)
  if (podIds && podIds.length) podQuery = podQuery.in('id', podIds)
  const { data: pods, error: podsErr } = await podQuery
  if (podsErr) throw new Error(`load pods: ${podsErr.message}`)

  // Load sentences for these pods in one go
  if (!pods || pods.length === 0) return []
  const { data: sentences, error: sErr } = await supabase
    .from('listening_pod_sentences')
    .select('*')
    .in('pod_id', pods.map(p => p.id))
    .order('pod_id').order('global_order')
  if (sErr) throw new Error(`load sentences: ${sErr.message}`)

  const byPod = {}
  for (const p of pods) byPod[p.id] = { ...p, sentences: [] }
  for (const s of sentences) byPod[s.pod_id]?.sentences.push(s)
  return Object.values(byPod)
}

/**
 * Get the course's known/target languages + known voice config.
 */
async function getCourseContext(courseCode) {
  const { data: course, error } = await supabase
    .from('courses').select('known_lang, target_lang, voice_config').eq('course_code', courseCode).single()
  if (error) throw new Error(`course not found: ${error.message}`)
  const vc = course.voice_config || {}
  const knownVoiceRaw = vc.voices?.known || {}
  const knownVoice = {
    voice_id: knownVoiceRaw.voiceId || knownVoiceRaw.voice_id || 'en-GB-SoniaNeural',
    provider: knownVoiceRaw.provider || 'azure',
    gender: knownVoiceRaw.gender || 'f',
  }
  return {
    knownLang: course.known_lang,
    targetLang: course.target_lang,
    knownVoice,
  }
}

// =============================================================================
// GET /plan-pods/:courseCode — what pod audio needs generating
// =============================================================================

app.get('/plan-pods/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const podIds = req.query.pods ? req.query.pods.split(',') : null

    const ctx = await getCourseContext(courseCode)
    const pods = await loadPodsForPlan(courseCode, podIds)

    const podPlans = []
    let totalChars = 0
    let totalMissing = 0

    for (const pod of pods) {
      const missing = { target: [], known: [] }
      for (const s of pod.sentences) {
        if (!s.target_audio_id) {
          const voice = resolvePodSpeakerVoice(pod.speakers, s.speaker)
          missing.target.push({ id: s.id, speaker: s.speaker, voice_id: voice.voice_id, chars: (s.target_text || '').length })
        }
        if (!s.known_audio_id) {
          missing.known.push({ id: s.id, voice_id: ctx.knownVoice.voice_id, chars: (s.known_text || '').length })
        }
      }
      const podChars = missing.target.reduce((a, b) => a + b.chars, 0) + missing.known.reduce((a, b) => a + b.chars, 0)
      podPlans.push({
        pod_id: pod.id,
        title: pod.title,
        pod_type: pod.pod_type,
        total_sentences: pod.sentences.length,
        sentences_needing_target: missing.target.length,
        sentences_needing_known: missing.known.length,
        chars: podChars,
        estimated_cost_usd: +(podChars * POD_CHARS_TO_COST).toFixed(4),
        distinct_speakers: [...new Set(pod.sentences.map(s => s.speaker))],
      })
      totalChars += podChars
      totalMissing += missing.target.length + missing.known.length
    }

    res.json({
      course_code: courseCode,
      course_context: { known_lang: ctx.knownLang, target_lang: ctx.targetLang, known_voice: ctx.knownVoice },
      total_clips_to_generate: totalMissing,
      total_chars: totalChars,
      estimated_cost_usd: +(totalChars * POD_CHARS_TO_COST).toFixed(4),
      pods: podPlans,
    })
  } catch (err) {
    logger.error(`[Pods /plan-pods] ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// POST /generate-pods/:courseCode — actually generate missing audio
// =============================================================================
// Body: { pod_ids?: string[], roles?: ('target'|'known')[], concurrency?: number }
// Default: all pods for the course, both roles, concurrency=5.

app.post('/generate-pods/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const body = req.body || {}
    const podIds = body.pod_ids || null
    const roles = body.roles || ['target', 'known']
    const concurrency = Math.max(1, Math.min(10, body.concurrency || 5))

    const ctx = await getCourseContext(courseCode)
    const pods = await loadPodsForPlan(courseCode, podIds)

    // Build a flat work queue: each item is one audio clip to generate.
    const workQueue = []
    for (const pod of pods) {
      for (const s of pod.sentences) {
        if (roles.includes('target') && !s.target_audio_id) {
          workQueue.push({
            kind: 'target',
            sentence_id: s.id,
            pod_id: pod.id,
            text: s.target_text,
            language: ctx.targetLang,
            role: 'target1',
            voice: resolvePodSpeakerVoice(pod.speakers, s.speaker),
            link_column: 'target_audio_id',
          })
        }
        if (roles.includes('known') && !s.known_audio_id) {
          workQueue.push({
            kind: 'known',
            sentence_id: s.id,
            pod_id: pod.id,
            text: s.known_text,
            language: ctx.knownLang,
            role: 'known',
            voice: ctx.knownVoice,
            link_column: 'known_audio_id',
          })
        }
      }
    }

    logger.info(`[Pods] ${courseCode}: ${workQueue.length} clips queued across ${pods.length} pod(s) at concurrency ${concurrency}`)

    const startMs = Date.now()
    let generated = 0, reused = 0, failed = 0
    const errors = []

    // Simple parallel batch processor — process `concurrency` items at a time
    async function worker(items) {
      for (const item of items) {
        try {
          const result = await generatePodAudio({
            courseCode,
            text: item.text,
            language: item.language,
            role: item.role,
            voice: item.voice,
          })

          // Link the audio onto the pod sentence
          const { error: linkErr } = await supabase
            .from('listening_pod_sentences')
            .update({ [item.link_column]: result.id })
            .eq('id', item.sentence_id)
          if (linkErr) throw new Error(`link: ${linkErr.message}`)

          if (result.reused) reused++; else generated++
        } catch (err) {
          failed++
          errors.push({ sentence_id: item.sentence_id, kind: item.kind, error: err.message })
          logger.warn(`[Pods] ${item.sentence_id} ${item.kind}: ${err.message}`)
        }
      }
    }

    // Distribute work across N workers (round-robin)
    const buckets = Array.from({ length: concurrency }, () => [])
    workQueue.forEach((item, i) => buckets[i % concurrency].push(item))
    await Promise.all(buckets.map(b => worker(b)))

    const elapsedMs = Date.now() - startMs
    logger.info(`[Pods] ${courseCode}: ${generated} generated, ${reused} reused, ${failed} failed in ${(elapsedMs / 1000).toFixed(1)}s`)

    res.json({
      course_code: courseCode,
      generated,
      reused,
      failed,
      total: workQueue.length,
      elapsed_ms: elapsedMs,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    logger.error(`[Pods /generate-pods] ${err.message}`)
    res.status(500).json({ error: err.message })
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
