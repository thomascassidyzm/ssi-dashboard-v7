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
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const { bumpCourseVersion } = require('../shared/course-version.cjs')
const createLogger = require('../shared/logger.cjs')
const ttsService = require('../tts-service.cjs')
const audioProcessor = require('../audio-processor.cjs')
const genderService = require('../gender-expansion-service.cjs')
const genderHaikuService = require('../gender-haiku-service.cjs')

const logger = createLogger('Phase8-Audio-v13')
const { bulkGetRegenerationCounts } = require('../supabase-client.cjs')

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
// LANGUAGE NAMES (for presentation templates)
// =============================================================================

// Language names in English (default / fallback)
const LANG_NAMES = {
  'eng': 'English', 'spa': 'Spanish', 'fra': 'French', 'deu': 'German',
  'ita': 'Italian', 'por': 'Portuguese', 'cmn': 'Chinese', 'zho': 'Chinese',
  'jpn': 'Japanese', 'kor': 'Korean', 'ara': 'Arabic', 'cym': 'Welsh',
  'gle': 'Irish', 'gla': 'Scottish Gaelic', 'nld': 'Dutch', 'rus': 'Russian',
  'swe': 'Swedish', 'fin': 'Finnish', 'tur': 'Turkish', 'bre': 'Breton',
  'eus': 'Basque', 'cat': 'Catalan', 'lit': 'Lithuanian', 'ang': 'Old English',
}

// Language names localised into each known language (for presentation TTS)
// Key: known_lang, Value: { target_lang: localised name }
const LANG_NAMES_LOCALISED = {
  jpn: { eng: '英語', spa: 'スペイン語', fra: 'フランス語', deu: 'ドイツ語', ita: 'イタリア語', por: 'ポルトガル語', cmn: '中国語', zho: '中国語', kor: '韓国語', ara: 'アラビア語', nld: 'オランダ語', rus: 'ロシア語' },
  kor: { eng: '영어', spa: '스페인어', fra: '프랑스어', deu: '독일어', ita: '이탈리아어', por: '포르투갈어', cmn: '중국어', zho: '중국어', jpn: '일본어', ara: '아랍어', nld: '네덜란드어', rus: '러시아어' },
  fra: { eng: 'anglais', spa: 'espagnol', deu: 'allemand', ita: 'italien', por: 'portugais', cmn: 'chinois', zho: 'chinois', jpn: 'japonais', kor: 'coréen', ara: 'arabe', nld: 'néerlandais', rus: 'russe', bre: 'breton' },
  deu: { eng: 'Englisch', spa: 'Spanisch', fra: 'Französisch', ita: 'Italienisch', por: 'Portugiesisch', cmn: 'Chinesisch', zho: 'Chinesisch', jpn: 'Japanisch', kor: 'Koreanisch', ara: 'Arabisch', nld: 'Niederländisch', rus: 'Russisch' },
  spa: { eng: 'inglés', fra: 'francés', deu: 'alemán', ita: 'italiano', por: 'portugués', cmn: 'chino', zho: 'chino', jpn: 'japonés', kor: 'coreano', ara: 'árabe', nld: 'neerlandés', rus: 'ruso', cat: 'catalán', eus: 'euskera' },
  por: { eng: 'inglês', spa: 'espanhol', fra: 'francês', deu: 'alemão', ita: 'italiano', cmn: 'chinês', zho: 'chinês', jpn: 'japonês', kor: 'coreano', ara: 'árabe', nld: 'neerlandês', rus: 'russo' },
  zho: { eng: '英语', spa: '西班牙语', fra: '法语', deu: '德语', ita: '意大利语', por: '葡萄牙语', jpn: '日语', kor: '韩语', ara: '阿拉伯语', nld: '荷兰语', rus: '俄语' },
  cmn: { eng: '英语', spa: '西班牙语', fra: '法语', deu: '德语', ita: '意大利语', por: '葡萄牙语', jpn: '日语', kor: '韩语', ara: '阿拉伯语', nld: '荷兰语', rus: '俄语' },
  ara: { eng: 'الإنجليزية', spa: 'الإسبانية', fra: 'الفرنسية', deu: 'الألمانية', ita: 'الإيطالية', por: 'البرتغالية', cmn: 'الصينية', zho: 'الصينية', jpn: 'اليابانية', kor: 'الكورية', nld: 'الهولندية', rus: 'الروسية' },
  cym: { eng: 'Saesneg', spa: 'Sbaeneg', fra: 'Ffrangeg', deu: 'Almaeneg', ita: 'Eidaleg', por: 'Portiwgaleg' },
  lit: { eng: 'angliškai', spa: 'ispaniškai', fra: 'prancūziškai', deu: 'vokiškai', por: 'portugališkai' },
}

// Get the target language name in the known language
function getLocalisedLangName(targetLang, knownLang) {
  const localised = LANG_NAMES_LOCALISED[knownLang]?.[targetLang]
  if (localised) return localised
  return LANG_NAMES[targetLang] || targetLang
}

// =============================================================================
// TEXT NORMALIZATION (for audio matching)
// =============================================================================

// Punctuation to strip when comparing text for audio matching
/**
 * Normalize text for audio matching comparison
 * Must match what the linking RPCs use: lower(trim(text))
 * Do NOT strip punctuation — punctuation affects TTS output and
 * the linking RPCs match on exact text_normalized (lowercase + trim only)
 */
function normalizeText(text) {
  if (!text) return ''
  return text.toLowerCase().trim()
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
  // - Western: .,;:!?-()[]{}
  // - CJK: 。、？！；：…—–「」『』（）【】
  // - Arabic/RTL: ؟،؛ (U+061F, U+060C, U+061B)
  // - Hebrew: ־ (U+05BE maqaf)
  return /^[.,;:!?。、？！；：…—–\-()[\]{}「」『』（）【】؟،؛־]+$/.test(trimmed)
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
async function linkAudioIds(courseCode, knownLang, targetLang) {
  const r = { practice_phrases: {}, legos: {}, seeds: {} }
  const BATCH_SIZE = 500
  const PAGE_SIZE = 1000

  // --- Step 1: Load all course_audio into a lookup map ---
  // Key: "text_normalized|language|role" → course_audio.id
  const audioMap = new Map()
  let audioOffset = 0
  let hasMore = true
  while (hasMore) {
    const { data, error } = await supabase
      .from('course_audio')
      .select('id, text_normalized, language, role')
      .eq('course_code', courseCode)
      .not('s3_key', 'like', 'pending/%')
      .order('id', { ascending: true })
      .range(audioOffset, audioOffset + PAGE_SIZE - 1)
    if (error) throw new Error(`Failed to load course_audio: ${error.message}`)
    for (const a of (data || [])) {
      audioMap.set(`${normalizeText(a.text_normalized)}|${a.language}|${a.role}`, a.id)
    }
    hasMore = (data || []).length === PAGE_SIZE
    audioOffset += PAGE_SIZE
  }
  logger.info(`linkAudioIds: loaded ${audioMap.size} audio entries for ${courseCode}`)

  // --- Helper: batch-update a column on a table ---
  async function batchUpdate(table, idCol, rows, column) {
    let count = 0
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      for (const row of batch) {
        const { error } = await supabase
          .from(table)
          .update({ [column]: row.audioId })
          .eq('course_code', courseCode)
          .eq(idCol, row.id)
        if (!error) count++
      }
    }
    return count
  }

  // --- Step 2: Link practice_phrases ---
  const phraseSlots = [
    { textCol: 'known_text', audioCol: 'known_audio_id', lang: knownLang, role: 'known' },
    { textCol: 'target_text', audioCol: 'target1_audio_id', lang: targetLang, role: 'target1' },
    { textCol: 'target_text', audioCol: 'target2_audio_id', lang: targetLang, role: 'target2' },
  ]
  for (const slot of phraseSlots) {
    const slotName = slot.audioCol.replace('_audio_id', '')
    const updates = []
    let offset = 0
    let more = true
    while (more) {
      const { data, error } = await supabase
        .from('course_practice_phrases')
        .select(`id, ${slot.textCol}`)
        .eq('course_code', courseCode)
        .is(slot.audioCol, null)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw new Error(`Failed to load phrases for ${slotName}: ${error.message}`)
      for (const row of (data || [])) {
        const key = `${normalizeText(row[slot.textCol])}|${slot.lang}|${slot.role}`
        const audioId = audioMap.get(key)
        if (audioId) updates.push({ id: row.id, audioId })
      }
      more = (data || []).length === PAGE_SIZE
      offset += PAGE_SIZE
    }
    if (updates.length > 0) {
      r.practice_phrases[slotName] = await batchUpdate('course_practice_phrases', 'id', updates, slot.audioCol)
    } else {
      r.practice_phrases[slotName] = 0
    }
    logger.info(`linkAudioIds: phrases.${slotName} = ${r.practice_phrases[slotName]}`)
  }

  // --- Step 3: Link legos ---
  const legoSlots = [
    { textCol: 'known_text', audioCol: 'known_audio_id', lang: knownLang, role: 'known' },
    { textCol: 'target_text', audioCol: 'target1_audio_id', lang: targetLang, role: 'target1' },
    { textCol: 'target_text', audioCol: 'target2_audio_id', lang: targetLang, role: 'target2' },
  ]
  for (const slot of legoSlots) {
    const slotName = slot.audioCol.replace('_audio_id', '')
    const updates = []
    let offset = 0
    let more = true
    while (more) {
      const { data, error } = await supabase
        .from('course_legos')
        .select(`lego_id, ${slot.textCol}`)
        .eq('course_code', courseCode)
        .is(slot.audioCol, null)
        .order('lego_id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw new Error(`Failed to load legos for ${slotName}: ${error.message}`)
      for (const row of (data || [])) {
        const key = `${normalizeText(row[slot.textCol])}|${slot.lang}|${slot.role}`
        const audioId = audioMap.get(key)
        if (audioId) updates.push({ id: row.lego_id, audioId })
      }
      more = (data || []).length === PAGE_SIZE
      offset += PAGE_SIZE
    }
    if (updates.length > 0) {
      r.legos[slotName] = await batchUpdate('course_legos', 'lego_id', updates, slot.audioCol)
    } else {
      r.legos[slotName] = 0
    }
    logger.info(`linkAudioIds: legos.${slotName} = ${r.legos[slotName]}`)
  }

  // --- Step 4: Link seeds ---
  const seedSlots = [
    { textCol: 'known_text', audioCol: 'known_audio_id', lang: knownLang, role: 'known' },
    { textCol: 'target_text', audioCol: 'target1_audio_id', lang: targetLang, role: 'target1' },
    { textCol: 'target_text', audioCol: 'target2_audio_id', lang: targetLang, role: 'target2' },
  ]
  for (const slot of seedSlots) {
    const slotName = slot.audioCol.replace('_audio_id', '')
    const updates = []
    let offset = 0
    let more = true
    while (more) {
      const { data, error } = await supabase
        .from('course_seeds')
        .select(`id, ${slot.textCol}`)
        .eq('course_code', courseCode)
        .is(slot.audioCol, null)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw new Error(`Failed to load seeds for ${slotName}: ${error.message}`)
      for (const row of (data || [])) {
        const key = `${normalizeText(row[slot.textCol])}|${slot.lang}|${slot.role}`
        const audioId = audioMap.get(key)
        if (audioId) updates.push({ id: row.id, audioId })
      }
      more = (data || []).length === PAGE_SIZE
      offset += PAGE_SIZE
    }
    if (updates.length > 0) {
      r.seeds[slotName] = await batchUpdate('course_seeds', 'id', updates, slot.audioCol)
    } else {
      r.seeds[slotName] = 0
    }
    logger.info(`linkAudioIds: seeds.${slotName} = ${r.seeds[slotName]}`)
  }

  // Also link presentation audio (belt-and-suspenders)
  const presResult = await linkPresentationAudio(courseCode)
  r.presentations = presResult.linked || 0
  r.total = Object.values(r).reduce((sum, cat) =>
    typeof cat === 'object' ? sum + Object.values(cat).reduce((s, v) => s + v, 0) : sum
  , 0) + (r.presentations || 0)

  logger.info(`linkAudioIds: total linked = ${r.total} for ${courseCode}`)
  return r
}

// =============================================================================
// HELPER: Link presentation audio to course_legos
// =============================================================================
// Belt-and-suspenders approach: matches course_audio (role=presentation, lego_id set)
// to course_legos.presentation_audio_id. Runs after any presentation generation.
// =============================================================================
async function linkPresentationAudio(courseCode) {
  // Get all presentation audio that has lego_id set and is not pending
  const { data: presentations, error: presError } = await supabase
    .from('course_audio')
    .select('id, lego_id')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .not('lego_id', 'is', null)
    .not('s3_key', 'like', 'pending/%')

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
    const PAGE_SIZE = 1000

    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    // Release target - only count audio needs up to this seed number (MVP = 260)
    const releaseTarget = course.seed_count || 260

    // Get what audio we have (paginated)
    // IMPORTANT: Exclude pending/ s3_keys - those are placeholders, not real audio
    // IMPORTANT: Must use ORDER BY for consistent pagination results
    const existingAudio = []
    let audioOffset = 0
    let hasMoreAudio = true

    while (hasMoreAudio) {
      const { data: audioBatch, error: audioError } = await supabase
        .from('course_audio')
        .select('text_normalized, language, role')
        .eq('course_code', courseCode)
        .not('s3_key', 'like', 'pending/%')
        .order('id')
        .range(audioOffset, audioOffset + PAGE_SIZE - 1)

      if (audioError) throw audioError

      if (audioBatch && audioBatch.length > 0) {
        existingAudio.push(...audioBatch)
        hasMoreAudio = audioBatch.length === PAGE_SIZE
        audioOffset += PAGE_SIZE
      } else {
        hasMoreAudio = false
      }
    }

    // Get what phrases we need (from practice phrases, paginated)
    // Only include phrases up to the release target
    // IMPORTANT: Must use ORDER BY for consistent pagination results
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

    // Build needed list
    const needed = []
    // Use normalizeText on both sides for punctuation-insensitive matching
    const existingSet = new Set(
      (existingAudio || []).map(a => `${normalizeText(a.text_normalized)}|${a.language}|${a.role}`)
    )

    for (const phrase of phrases || []) {
      // Known language audio
      const knownKey = `${normalizeText(phrase.known_text)}|${course.known_lang}|known`
      if (!existingSet.has(knownKey)) {
        needed.push({ text: phrase.known_text, language: course.known_lang, role: 'known' })
      }

      // Target language audio (target1 and target2)
      for (const role of ['target1', 'target2']) {
        const targetKey = `${normalizeText(phrase.target_text)}|${course.target_lang}|${role}`
        if (!existingSet.has(targetKey)) {
          needed.push({ text: phrase.target_text, language: course.target_lang, role })
        }
      }
    }

    // Also include LEGO debut audio (the LEGO text itself needs known/target1/target2)
    // Only include LEGOs up to the release target
    const { data: allLegos } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .lte('seed_number', releaseTarget)

    if (allLegos?.length > 0) {
      for (const lego of allLegos) {
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
    }

    // Also include seed sentence audio (full seed sentences need known/target1/target2)
    // Only include released seeds up to the release target
    const { data: allSeeds } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .eq('status', 'released')
      .lte('seed_number', releaseTarget)

    if (allSeeds?.length > 0) {
      for (const seed of allSeeds) {
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
    }

    // Get LEGOs that need presentation audio (is_new = true)
    // These are the LEGOs that require a presentation intro like "The Spanish for 'word', is:"
    // Only include LEGOs up to the release target
    const { data: newLegos, error: legosError } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, known_text, presentation_audio_id')
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .lte('seed_number', releaseTarget)

    if (legosError) throw legosError

    // Get existing presentation audio (exclude pending/)
    const { data: existingPresentations } = await supabase
      .from('course_audio')
      .select('lego_id')
      .eq('course_code', courseCode)
      .eq('role', 'presentation')
      .not('s3_key', 'like', 'pending/%')

    // Build set of lego_ids that have presentation audio in course_audio
    const legoIdsWithPresentation = new Set(
      (existingPresentations || []).map(p => p.lego_id).filter(Boolean)
    )

    // Count missing presentations
    const missingPresentationLegos = []
    for (const lego of newLegos || []) {
      // Skip if already bound on the LEGO itself (authoritative)
      if (lego.presentation_audio_id) continue
      // Skip if presentation audio exists in course_audio by lego_id (generated but not yet bound)
      if (legoIdsWithPresentation.has(lego.lego_id)) continue
      missingPresentationLegos.push({
        text: lego.known_text,  // Will be expanded to full presentation text during generation
        language: course.known_lang,
        role: 'presentation',
        lego_id: lego.lego_id
      })
    }

    if (missingPresentationLegos.length > 0) {
      needed.push(...missingPresentationLegos)
      logger.info(`Found ${missingPresentationLegos.length} LEGOs missing presentation audio`)
    }

    // Deduplicate
    const uniqueNeededRaw = [...new Map(
      needed.map(n => [`${n.text}|${n.language}|${n.role}`, n])
    ).values()]

    // Filter out punctuation-only items (TTS can't generate these)
    // This matches what the generate endpoint does, so plan and generate counts align
    const uniqueNeeded = uniqueNeededRaw.filter(n => !isPunctuationOnly(n.text))

    // Cost estimate (rough: $0.016 per 1000 chars for Azure Neural)
    const totalChars = uniqueNeeded.reduce((sum, n) => sum + n.text.length, 0)
    const estimatedCost = (totalChars / 1000) * 0.016

    // Count existing by role
    // existingAudio has known/target1/target2 (presentation is filtered separately)
    // existingPresentations has presentation audio
    const existingByRole = {
      known: 0,
      target1: 0,
      target2: 0,
      presentation: (existingPresentations || []).length  // Count presentation audio records
    }
    for (const audio of existingAudio || []) {
      // Only count known/target1/target2 here (presentation counted separately)
      if (audio.role !== 'presentation' && existingByRole[audio.role] !== undefined) {
        existingByRole[audio.role]++
      }
    }

    // Calculate TOTAL REQUIRED based on current course content (not orphaned audio)
    // Unique texts that need audio: phrases + legos + seeds
    // Exclude punctuation-only items (TTS can't generate these)
    const uniqueTextsForAudio = new Set()

    // Count unique known/target texts (excluding punctuation-only)
    for (const phrase of phrases || []) {
      if (!isPunctuationOnly(phrase.known_text)) {
        uniqueTextsForAudio.add(`known|${normalizeText(phrase.known_text)}`)
      }
      if (!isPunctuationOnly(phrase.target_text)) {
        uniqueTextsForAudio.add(`target|${normalizeText(phrase.target_text)}`)
      }
    }
    for (const lego of allLegos || []) {
      if (!isPunctuationOnly(lego.known_text)) {
        uniqueTextsForAudio.add(`known|${normalizeText(lego.known_text)}`)
      }
      if (!isPunctuationOnly(lego.target_text)) {
        uniqueTextsForAudio.add(`target|${normalizeText(lego.target_text)}`)
      }
    }
    for (const seed of allSeeds || []) {
      if (!isPunctuationOnly(seed.known_text)) {
        uniqueTextsForAudio.add(`known|${normalizeText(seed.known_text)}`)
      }
      if (!isPunctuationOnly(seed.target_text)) {
        uniqueTextsForAudio.add(`target|${normalizeText(seed.target_text)}`)
      }
    }

    // Total required: unique known texts + unique target texts × 2 (target1, target2) + presentations
    const uniqueKnownTexts = [...uniqueTextsForAudio].filter(k => k.startsWith('known|')).length
    const uniqueTargetTexts = [...uniqueTextsForAudio].filter(k => k.startsWith('target|')).length
    const totalPresentationsNeeded = newLegos?.length || 0

    // Total required = unique audio needs from current content (phrases + legos + seeds + presentations)
    // Count existing by checking which needed items have matching audio (not ALL audio records)
    const totalMissing = uniqueNeeded.length

    // Count existing audio that matches CURRENT content only (not orphaned audio from deleted phrases)
    // Build the full needed set (including items that already have audio) and count matches
    const fullNeededSet = new Set()
    for (const phrase of phrases || []) {
      if (!isPunctuationOnly(phrase.known_text)) {
        fullNeededSet.add(`${normalizeText(phrase.known_text)}|${course.known_lang}|known`)
      }
      if (!isPunctuationOnly(phrase.target_text)) {
        fullNeededSet.add(`${normalizeText(phrase.target_text)}|${course.target_lang}|target1`)
        fullNeededSet.add(`${normalizeText(phrase.target_text)}|${course.target_lang}|target2`)
      }
    }
    for (const lego of allLegos || []) {
      if (!isPunctuationOnly(lego.known_text)) {
        fullNeededSet.add(`${normalizeText(lego.known_text)}|${course.known_lang}|known`)
      }
      if (!isPunctuationOnly(lego.target_text)) {
        fullNeededSet.add(`${normalizeText(lego.target_text)}|${course.target_lang}|target1`)
        fullNeededSet.add(`${normalizeText(lego.target_text)}|${course.target_lang}|target2`)
      }
    }
    for (const seed of allSeeds || []) {
      if (!isPunctuationOnly(seed.known_text)) {
        fullNeededSet.add(`${normalizeText(seed.known_text)}|${course.known_lang}|known`)
      }
      if (!isPunctuationOnly(seed.target_text)) {
        fullNeededSet.add(`${normalizeText(seed.target_text)}|${course.target_lang}|target1`)
        fullNeededSet.add(`${normalizeText(seed.target_text)}|${course.target_lang}|target2`)
      }
    }

    let matchedExisting = 0
    for (const key of fullNeededSet) {
      if (existingSet.has(key)) matchedExisting++
    }
    // Add presentation audio that matches current LEGOs
    let presentationsExisting = 0
    for (const lego of newLegos || []) {
      if (lego.presentation_audio_id || legoIdsWithPresentation.has(lego.lego_id)) {
        presentationsExisting++
      }
    }
    const totalExisting = matchedExisting + presentationsExisting
    const totalRequired = fullNeededSet.size + totalPresentationsNeeded

    res.json({
      courseCode,
      releaseTarget,
      course: {
        displayName: course.display_name,
        knownLang: course.known_lang,
        targetLang: course.target_lang,
        voiceConfig: course.voice_config
      },
      existing: totalExisting,  // Audio that matches current requirements
      missing: totalMissing,
      total: totalRequired,  // existing + missing
      totalPhrases: phrases.length,
      totalPresentationsNeeded,
      uniqueKnownTexts,
      uniqueTargetTexts,
      estimatedCost: `$${estimatedCost.toFixed(2)}`,
      estimatedChars: totalChars,
      breakdown: {
        known: uniqueNeeded.filter(n => n.role === 'known').length,
        target1: uniqueNeeded.filter(n => n.role === 'target1').length,
        target2: uniqueNeeded.filter(n => n.role === 'target2').length,
        presentation: uniqueNeeded.filter(n => n.role === 'presentation').length
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

    // Release target - only generate audio for seeds up to this number (MVP = 260)
    // This must match the /plan endpoint logic for consistent results
    const releaseTarget = course.seed_count || 260

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

    // Get existing audio (paginated)
    // IMPORTANT: Exclude pending/ s3_keys - those are placeholders, not real audio
    // IMPORTANT: Must use ORDER BY for consistent pagination results
    const existingAudio = []
    let audioOffset = 0
    let hasMoreAudio = true

    while (hasMoreAudio) {
      const { data: audioBatch, error: audioError } = await supabase
        .from('course_audio')
        .select('text_normalized, language, role')
        .eq('course_code', courseCode)
        .not('s3_key', 'like', 'pending/%')
        .order('id')
        .range(audioOffset, audioOffset + PAGE_SIZE - 1)

      if (audioError) throw audioError

      if (audioBatch && audioBatch.length > 0) {
        existingAudio.push(...audioBatch)
        hasMoreAudio = audioBatch.length === PAGE_SIZE
        audioOffset += PAGE_SIZE
      } else {
        hasMoreAudio = false
      }
    }

    // Use normalizeText on both sides for punctuation-insensitive matching
    const existingSet = new Set(
      existingAudio.map(a => `${normalizeText(a.text_normalized)}|${a.language}|${a.role}`)
    )

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
      // Get existing presentation audio (exclude pending/ since we handled those above)
      const { data: existingPresentations } = await supabase
        .from('course_audio')
        .select('lego_id')
        .eq('course_code', courseCode)
        .eq('role', 'presentation')
        .not('s3_key', 'like', 'pending/%')

      // Build set of lego_ids that have presentation audio in course_audio
      const legoIdsWithPresentation = new Set(
        (existingPresentations || []).map(p => p.lego_id).filter(Boolean)
      )

      // Exclude LEGOs that have pending presentations (already added above)
      const pendingLegoIds = new Set(
        (pendingPresentations || []).map(p => p.lego_id).filter(Boolean)
      )

      // Get presentation template for this course
      const targetLangName = getLocalisedLangName(course.target_lang, course.known_lang)
      const { data: templates } = await supabase
        .from('presentation_templates')
        .select('template')
        .eq('known_lang', course.known_lang)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)

      let presentationTemplate = templates?.[0]?.template
      if (!presentationTemplate) {
        presentationTemplate = "The {target_lang_name} for — '{known}' — as in — '{seed}' — is:"
      }

      // Build short template (no "as in" context) for LEGOs where no good context exists
      const shortPresentationTemplate = presentationTemplate
        .replace(/ as in — '\{seed\}' —/g, '')          // eng
        .replace(/ como en — '\{seed\}' —/g, '')         // spa
        .replace(/ comme dans — '\{seed\}' —/g, '')      // fra
        .replace(/ wie in — '\{seed\}' —/g, '')           // deu
        .replace(/ como em — '\{seed\}' —/g, '')          // por
        .replace(/ fel yn — '\{seed\}' —/g, '')           // cym
        .replace(/ — 「\{seed\}」のように —/g, '')          // jpn
        .replace(/ — '\{seed\}'처럼 —/g, '')               // kor
        .replace(/ كما في — '\{seed\}' —/g, '')           // ara
        .replace(/ kaip — '\{seed\}' —/g, '')             // lit
        .replace(/ 如「\{seed\}」—/g, '')                   // zho/cmn
        .replace(/, as in '\{seed\}'/g, '')               // eng (legacy)
        .replace(/，如"\{seed\}"/g, '')                    // zho (legacy)
        .replace(/, fel yn '\{seed\}'/g, '')              // cym (legacy)
        .replace(/, como en '\{seed\}'/g, '')             // spa (legacy)

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

    // Deduplicate
    const uniqueNeeded = [...new Map(
      needed.map(n => [`${n.text}|${n.language}|${n.role}`, n])
    ).values()].slice(0, limit)

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
          .select('s3_key, duration_ms, viseme_data')
          .neq('course_code', courseCode)
          .eq('text_normalized', item.text.toLowerCase().trim())
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
              text_normalized: item.text.toLowerCase().trim(),
              language: item.language,
              role: item.role,
              voice_id: item.voiceId,
              origin: 'tts',
              s3_key: siblingAudio.s3_key,
              duration_ms: siblingAudio.duration_ms,
              lego_id: item.lego_id || null,
              viseme_data: siblingAudio.viseme_data || null
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
      let rawAudioBuffer, visemes
      if (provider === 'azure') {
        ({ audioBuffer: rawAudioBuffer, visemes } = await ttsService.generateWithRetry(textForTTS, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName: voiceName,
          speed
        }))
      } else if (provider === 'elevenlabs') {
        ({ audioBuffer: rawAudioBuffer, visemes } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceName,
          speed
        }))
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
      // Include lego_id for presentation audio (needed for /plan matching)
      // Use .select('id') to get the ID back directly for linking
      const { data: insertedAudio, error: insertError } = await supabase
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
          duration_ms: durationMs,
          lego_id: item.lego_id || null,
          viseme_data: visemes || null
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

      // Periodically link audio IDs every 10 batches so progress is visible
      // even if generation is interrupted
      if (batchNum % 10 === 0) {
        try {
          const mid = await linkAudioIds(courseCode, course.known_lang, course.target_lang)
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
        const linkResults = await linkAudioIds(courseCode, course.known_lang, course.target_lang)
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
      let rawAudioBuffer, visemes
      if (voiceProvider === 'azure') {
        ({ audioBuffer: rawAudioBuffer, visemes } = await ttsService.generateWithRetry(textForTTS, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName: voiceId,
          speed,
          regenerationAttempt  // Pass to TTS for variation
        }))
      } else if (voiceProvider === 'elevenlabs') {
        ({ audioBuffer: rawAudioBuffer, visemes } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceId,
          speed
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
          viseme_data: visemes || null
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
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const knownLang = course.known_lang
    const targetLang = course.target_lang
    const targetLangName = getLocalisedLangName(targetLang, knownLang)

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
      template = "The {target_lang_name} for — '{known}' — as in — '{seed}' — is:"
      logger.warn(`No template found for ${knownLang}, using default English`)
    }

    logger.info(`Using template: ${template}`)

    // Get LEGOs where is_new=true (only new introductions need presentation audio)
    const PAGE_SIZE = 1000
    const legos = []
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
        legos.push(...legosBatch)
        hasMoreLegos = legosBatch.length === PAGE_SIZE
        legosOffset += PAGE_SIZE
      } else {
        hasMoreLegos = false
      }
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
      .replace(/ as in — '\{seed\}' —| como en — '\{seed\}' —| comme dans — '\{seed\}' —| wie in — '\{seed\}' —| como em — '\{seed\}' —| fel yn — '\{seed\}' —| — 「\{seed\}」のように —| — '\{seed\}'처럼 —| كما في — '\{seed\}' —| kaip — '\{seed\}' —| 如「\{seed\}」—|, as in '\{seed\}'|，如"\{seed\}"|, fel yn '\{seed\}'|, como en '\{seed\}'/g, '')

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

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        courseCode,
        template,
        shortTemplate,
        targetLangName,
        count: presentations.length,
        contextStats,
        sample: presentations.slice(0, 10)  // Show first 10 to see alternation
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
      const newNorm = pres.presentation_text.toLowerCase().trim()
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

    // Build records for bulk upsert (skip unchanged — their records already exist)
    const audioRecords = presentations
      .filter(pres => !unchangedLegoIds.has(pres.lego_id))
      .map(pres => ({
        course_code: courseCode,
        text: pres.presentation_text,
        text_normalized: pres.presentation_text.toLowerCase().trim(),
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
        .select('id, lego_id')
        .eq('course_code', courseCode)
        .eq('role', 'presentation')
        .not('s3_key', 'like', 'pending/%')
        .in('lego_id', batch)

      if (batchError) {
        logger.warn(`Batch query error at offset ${i}:`, batchError.message)
      } else if (batchData) {
        allPresAudio = allPresAudio.concat(batchData)
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
      textChanged: idsToDelete.length,
      textUnchanged: unchangedLegoIds.size,
      newRecords: audioRecords.length,
      contextStats,
      message: `${presentations.length} presentations processed (${idsToDelete.length} text changed, ${unchangedLegoIds.size} unchanged, ${presentations.length - idsToDelete.length - unchangedLegoIds.size} new). Run regenerate-role with role=presentation to generate audio.`
    })

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

    const linkResults = await linkAudioIds(courseCode, course.known_lang, course.target_lang)

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

    let rawAudioBuffer, visemes
    if (voiceProvider === 'azure') {
      ({ audioBuffer: rawAudioBuffer, visemes } = await ttsService.generateWithRetry(textForTTS, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION || 'westeurope',
        voiceName: voiceId,
        speed,
        regenerationAttempt: regenCount
      }))
    } else if (voiceProvider === 'elevenlabs') {
      ({ audioBuffer: rawAudioBuffer, visemes } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: voiceId,
        speed
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
        viseme_data: visemes || null
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
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  logger.info(`Phase 8 Audio Service (v13) running on port ${PORT}`)
  logger.info(`Supabase: ${process.env.SUPABASE_URL ? 'configured' : 'NOT configured'}`)
  logger.info(`S3 Bucket: ${S3_BUCKET}`)
})

module.exports = app
