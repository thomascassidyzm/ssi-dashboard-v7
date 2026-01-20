/**
 * Legacy Manifest Generator
 *
 * Generates backwards-compatible JSON manifests for new database-first courses,
 * so they work with the OLD learning app that expects the legacy manifest format.
 *
 * Data sources (in priority order):
 * 1. Supabase tables: course_seeds, course_legos, course_practice_phrases, course_audio
 * 2. Fallback: lego_pairs.json, lego_baskets.json (local files)
 *
 * Key differences from new format:
 * - Uses 2-letter language codes (en, es) instead of 3-letter (eng, spa)
 * - Has a `samples` dictionary mapping text → audio info (id, role, cadence, duration)
 * - Uses role "source" instead of "known"
 * - Empty tokens/lemmas arrays to reduce file size
 *
 * Usage:
 *   node generate-legacy-manifest.cjs <courseCode>              # JSON only (fast)
 *   node generate-legacy-manifest.cjs <courseCode> --with-audio # Generate combined presentations
 *   node generate-legacy-manifest.cjs <courseCode> --with-audio --dry-run  # Preview only
 *   node generate-legacy-manifest.cjs <courseCode> --with-audio --limit 10  # First N only
 */

// =============================================================================
// TODO: COMBINED PRESENTATION AUDIO STORAGE
// =============================================================================
// Currently, combined presentation audio (narration + target1 + target2) is
// regenerated on each legacy export. This works but is slow.
//
// Future options:
// 1. Store combined_audio_id in lego_introductions table
// 2. Store in course_audio with role='presentation_combined'
// 3. Keep regenerating (current approach)
//
// Decision needed: Should we persist these to avoid regeneration?
// =============================================================================

const path = require('path')
const fs = require('fs')
const os = require('os')
const { v4: uuidv4, v5: uuidv5 } = require('uuid')
const { execSync } = require('child_process')

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const supabaseClient = require('../supabase-client.cjs')
const s3Service = require('../s3-service.cjs')
const uuidService = require('../uuid-service.cjs')

// =============================================================================
// CONSTANTS
// =============================================================================

// Language code mapping (ISO 639-3 → ISO 639-1)
const LANG_MAP = {
  'eng': 'en', 'spa': 'es', 'fra': 'fr', 'deu': 'de',
  'ita': 'it', 'por': 'pt', 'zho': 'zh', 'jpn': 'ja',
  'cym': 'cy', 'ara': 'ar', 'kor': 'ko', 'nld': 'nl',
  'rus': 'ru', 'hin': 'hi', 'ben': 'bn', 'vie': 'vi'
}

// UUID namespace for deterministic IDs
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

// Fallback intro audio (used if no welcome in database)
const PLACEHOLDER_INTRO = {
  id: '00000000-0000-0000-0000-000000000001',
  cadence: 'natural',
  role: 'presentation',
  duration: 45.0
}

/**
 * Extract UUID from s3_key (e.g., "mastered/ABC123.mp3" -> "ABC123")
 */
function uuidFromS3Key(s3Key) {
  if (!s3Key) return null
  return s3Key.replace('mastered/', '').replace('.mp3', '')
}

// =============================================================================
// DATABASE LOADERS
// =============================================================================

/**
 * Load seeds from database (only released seeds for legacy manifest)
 */
async function loadSeedsFromDB(courseCode) {
  const client = supabaseClient.getClient()
  if (!client) return null

  const { data, error } = await client
    .from('course_seeds')
    .select('seed_number, seed_id, known_text, target_text')
    .eq('course_code', courseCode)
    .eq('status', 'released')
    .order('seed_number')

  if (error) {
    console.error('  Warning: Could not load seeds from DB:', error.message)
    return null
  }

  return data
}

/**
 * Load LEGOs from database
 */
async function loadLegosFromDB(courseCode) {
  const client = supabaseClient.getClient()
  if (!client) return null

  const { data, error } = await client
    .from('course_legos')
    .select('seed_number, lego_index, lego_id, type, is_new, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index')

  if (error) {
    console.error('  Warning: Could not load LEGOs from DB:', error.message)
    return null
  }

  return data
}

/**
 * Load practice phrases from database
 */
async function loadPracticePhrasesFromDB(courseCode) {
  const client = supabaseClient.getClient()
  if (!client) return null

  const { data, error } = await client
    .from('course_practice_phrases')
    .select('seed_number, lego_index, word_count, known_text, target_text, position, phrase_role')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index')
    .order('word_count')
    .order('position')

  if (error) {
    console.error('  Warning: Could not load practice phrases from DB:', error.message)
    return null
  }

  return data
}

/**
 * Load audio records from database
 */
async function loadAudioFromDB(courseCode) {
  const client = supabaseClient.getClient()
  if (!client) return null

  const { data, error } = await client
    .from('course_audio')
    .select('id, text, text_normalized, language, role, duration_ms, lego_id, s3_key')
    .eq('course_code', courseCode)

  if (error) {
    console.error('  Warning: Could not load audio from DB:', error.message)
    return null
  }

  return data
}

/**
 * Load welcome, instructions, and encouragements from database
 */
async function loadWelcomeAndEncouragements(courseCode) {
  const client = supabaseClient.getClient()
  if (!client) return { welcome: null, instructions: [], encouragements: [] }

  // Load welcome
  const { data: welcomeData } = await client
    .from('course_audio')
    .select('id, text, s3_key, duration_ms')
    .eq('course_code', courseCode)
    .eq('role', 'welcome')
    .limit(1)

  // Load instructions (orderedEncouragements)
  const { data: instructionsData } = await client
    .from('course_audio')
    .select('id, text, s3_key, duration_ms')
    .eq('course_code', courseCode)
    .eq('role', 'instruction')
    .order('text')  // Consistent ordering

  // Load encouragements (pooledEncouragements)
  const { data: encouragementsData } = await client
    .from('course_audio')
    .select('id, text, s3_key, duration_ms')
    .eq('course_code', courseCode)
    .eq('role', 'encouragement')

  return {
    welcome: welcomeData?.[0] || null,
    instructions: instructionsData || [],
    encouragements: encouragementsData || []
  }
}

// =============================================================================
// FILE LOADERS (FALLBACK)
// =============================================================================

/**
 * Load lego_pairs.json for seed structure (fallback)
 */
function loadLegoPairsFromFile(courseCode) {
  const possiblePaths = [
    path.join(__dirname, `../../tools/vfs/courses/${courseCode}/lego_pairs.json`),
    path.join(__dirname, `../../public/vfs/courses/${courseCode}/lego_pairs.json`)
  ]

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  }

  return null
}

/**
 * Load encouragements
 */
function loadEncouragements() {
  const filePath = path.join(__dirname, '../../public/vfs/canonical/eng_encouragements.json')
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  }
  return { pooledEncouragements: [], orderedEncouragements: [] }
}

// =============================================================================
// UUID GENERATORS
// =============================================================================

function generateTextUUID(text) {
  return uuidv5(text, NAMESPACE).toUpperCase()
}

function generateSliceUUID() {
  return uuidv4().toUpperCase()
}

// =============================================================================
// NODE BUILDERS
// =============================================================================

function buildNode(id, knownText, targetText) {
  return {
    id,
    known: { text: knownText, tokens: [], lemmas: [] },
    target: { text: targetText, tokens: [], lemmas: [] }
  }
}

function buildPresentation(knownLego, targetLego, targetLangName) {
  return `The ${targetLangName} for '${knownLego}', is: ... '${targetLego}' ... '${targetLego}'`
}

function getLanguageName(langCode) {
  const names = {
    'spa': 'Spanish', 'fra': 'French', 'deu': 'German',
    'ita': 'Italian', 'por': 'Portuguese', 'zho': 'Chinese',
    'jpn': 'Japanese', 'cym': 'Welsh', 'ara': 'Arabic',
    'kor': 'Korean', 'nld': 'Dutch', 'rus': 'Russian'
  }
  return names[langCode] || langCode
}

// =============================================================================
// SAMPLES BUILDER
// =============================================================================

function buildSamplesDictionary(audioRecords, allTexts, knownLang, targetLang) {
  const samples = {}

  if (!audioRecords || audioRecords.length === 0) {
    console.error('  Warning: No audio records, samples will be empty')
    return samples
  }

  // Build lookup by normalized text + language + role
  const audioLookup = new Map()
  for (const record of audioRecords) {
    const key = `${record.text_normalized}|${record.language}|${record.role}`
    audioLookup.set(key, record)
  }

  // Process each unique text
  for (const { text, isKnown } of allTexts) {
    if (!text) continue

    const normalizedText = text.toLowerCase().trim()
    const lang = isKnown ? knownLang : targetLang

    // Old manifest uses "source" instead of "known"
    const roles = isKnown ? ['known'] : ['target1', 'target2']
    const legacyRoles = isKnown ? ['source'] : ['target1', 'target2']
    const cadence = isKnown ? 'natural' : 'slow'

    const sampleEntries = []

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i]
      const legacyRole = legacyRoles[i]
      const key = `${normalizedText}|${lang}|${role}`
      const record = audioLookup.get(key)

      if (record) {
        sampleEntries.push({
          id: record.id.toUpperCase(),
          role: legacyRole,
          cadence,
          duration: record.duration_ms ? record.duration_ms / 1000 : 0
        })
      }
    }

    if (sampleEntries.length > 0) {
      samples[text] = sampleEntries
      if (text.endsWith('.')) {
        samples[text.slice(0, -1)] = sampleEntries
      }
    }
  }

  return samples
}

// =============================================================================
// AUDIO CONCATENATION
// =============================================================================

/**
 * Concatenate audio files with silence pauses between them
 * No normalization - all audio is already mastered to -16 LUFS
 *
 * @param {string[]} audioPaths - Array of local audio file paths
 * @param {string} outputPath - Output file path
 * @param {number} pauseMs - Pause duration in milliseconds (default: 1000)
 */
async function concatenateWithPauses(audioPaths, outputPath, pauseMs = 1000) {
  const workDir = path.join(os.tmpdir(), `concat-${uuidv4()}`)
  fs.mkdirSync(workDir, { recursive: true })

  try {
    // Create silence file
    const silencePath = path.join(workDir, 'silence.mp3')
    const silenceDuration = pauseMs / 1000
    execSync(
      `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${silenceDuration} -q:a 2 "${silencePath}" -y 2>/dev/null`,
      { stdio: 'pipe' }
    )

    // Create concat list file
    const listPath = path.join(workDir, 'list.txt')
    const listContent = []

    for (let i = 0; i < audioPaths.length; i++) {
      listContent.push(`file '${audioPaths[i]}'`)
      // Add silence between files (but not after the last one)
      if (i < audioPaths.length - 1) {
        listContent.push(`file '${silencePath}'`)
      }
    }

    fs.writeFileSync(listPath, listContent.join('\n'))

    // Concatenate using FFmpeg concat demuxer with re-encoding
    // Re-encoding handles any format variations between input files
    execSync(
      `ffmpeg -f concat -safe 0 -i "${listPath}" -ar 44100 -ac 2 -b:a 192k "${outputPath}" -y 2>/dev/null`,
      { stdio: 'pipe' }
    )

    return true
  } finally {
    // Clean up work directory
    fs.rmSync(workDir, { recursive: true, force: true })
  }
}

/**
 * Generate combined presentation audio files
 * Each file contains: narration + 1s pause + target1 + 1s pause + target2
 *
 * @param {string} courseCode - Course identifier
 * @param {object[]} introItems - Array of {legoId, knownText, targetText, presentation}
 * @param {Map} audioLookup - Map of (text_normalized|language|role) -> audio record
 * @param {Map} presentationByLegoId - Map of lego_id -> presentation audio record
 * @param {string} targetLang - Target language code
 * @param {string} knownLang - Known language code
 * @param {object} options - { dryRun, limit, concurrency }
 * @returns {Promise<Map>} Map of legoId -> combined audio UUID
 */
async function generateCombinedPresentations(courseCode, introItems, audioLookup, presentationByLegoId, targetLang, knownLang, options = {}) {
  const { dryRun = false, limit = 0, concurrency = 2 } = options
  const results = new Map()
  const errors = []
  const skipped = []

  // Apply limit if specified
  const itemsToProcess = limit > 0 ? introItems.slice(0, limit) : introItems

  console.error(`\n  Generating combined presentations (${itemsToProcess.length} items, concurrency=${concurrency}, dryRun=${dryRun})...`)

  if (dryRun) {
    console.error('  DRY RUN - showing what would be generated:')
    for (const item of itemsToProcess.slice(0, 10)) {
      // Presentation is looked up by lego_id, targets by text
      const target1Key = `${item.targetText.toLowerCase().trim()}|${targetLang}|target1`
      const target2Key = `${item.targetText.toLowerCase().trim()}|${targetLang}|target2`

      const hasPresentation = presentationByLegoId.has(item.legoId)
      const hasTarget1 = audioLookup.has(target1Key)
      const hasTarget2 = audioLookup.has(target2Key)

      const status = (hasPresentation && hasTarget1 && hasTarget2) ? '✓' : '✗'
      console.error(`    ${status} ${item.legoId}: presentation=${hasPresentation}, target1=${hasTarget1}, target2=${hasTarget2}`)
    }
    if (itemsToProcess.length > 10) {
      console.error(`    ... and ${itemsToProcess.length - 10} more`)
    }
    return results
  }

  // Create temp directory for downloads
  const downloadDir = path.join(os.tmpdir(), `legacy-audio-${courseCode}-${Date.now()}`)
  fs.mkdirSync(downloadDir, { recursive: true })

  // Cache for downloaded files (avoid re-downloading same target audio)
  const downloadCache = new Map()

  // Use S3_BUCKET from env for legacy manifest (course audio may be in different bucket)
  const audioBucket = process.env.S3_BUCKET || 'ssi-audio-stage'

  /**
   * Download audio file from S3 (with caching)
   * Uses s3_key from database to get the correct file
   */
  async function downloadAudioCached(s3Key, label) {
    if (downloadCache.has(s3Key)) {
      return downloadCache.get(s3Key)
    }
    // Extract UUID from s3_key (e.g., "mastered/ABC123.mp3" -> "ABC123")
    const uuid = s3Key.replace('mastered/', '').replace('.mp3', '')
    const localPath = path.join(downloadDir, `${uuid}.mp3`)
    try {
      await s3Service.downloadAudioFile(uuid, localPath, audioBucket)
      downloadCache.set(s3Key, localPath)
      return localPath
    } catch (err) {
      console.error(`    Warning: Failed to download ${label} (${s3Key}): ${err.message}`)
      return null
    }
  }

  /**
   * Process a single presentation
   */
  async function processOne(item) {
    // Look up the three component audio files
    // Presentation is looked up by lego_id, targets by text
    const target1Key = `${item.targetText.toLowerCase().trim()}|${targetLang}|target1`
    const target2Key = `${item.targetText.toLowerCase().trim()}|${targetLang}|target2`

    const presRecord = presentationByLegoId.get(item.legoId)
    const target1Record = audioLookup.get(target1Key)
    const target2Record = audioLookup.get(target2Key)

    // Skip if any component is missing
    if (!presRecord || !target1Record || !target2Record) {
      const missing = []
      if (!presRecord) missing.push('presentation')
      if (!target1Record) missing.push('target1')
      if (!target2Record) missing.push('target2')
      skipped.push({ legoId: item.legoId, missing })
      return null
    }

    try {
      // Download all three audio files using s3_key from database
      const presPath = await downloadAudioCached(presRecord.s3_key, `presentation for ${item.legoId}`)
      const target1Path = await downloadAudioCached(target1Record.s3_key, `target1 for ${item.legoId}`)
      const target2Path = await downloadAudioCached(target2Record.s3_key, `target2 for ${item.legoId}`)

      if (!presPath || !target1Path || !target2Path) {
        skipped.push({ legoId: item.legoId, missing: ['download failed'] })
        return null
      }

      // Generate combined audio with deterministic UUID
      // Uses same pattern as other audio: text|language|role|cadence|voiceId
      // The presentation text is unique so this won't collide with individual audio
      const combinedUuid = uuidService.generateSampleUUID(
        item.presentation,  // e.g., "The Italian for 'with you', is: ... 'con te' ... 'con te'"
        knownLang,          // 'eng'
        'presentation_combined',  // distinct role
        'natural',
        'combined'          // pseudo-voiceId to indicate concatenated audio
      )
      const combinedPath = path.join(downloadDir, `combined-${combinedUuid}.mp3`)

      await concatenateWithPauses([presPath, target1Path, target2Path], combinedPath, 1000)

      // Upload to S3 (same bucket as source audio)
      const uploadResult = await s3Service.uploadAudioFile(combinedUuid, combinedPath, audioBucket)

      // Clean up combined file (keep cache files for reuse)
      fs.unlinkSync(combinedPath)

      return { legoId: item.legoId, uuid: combinedUuid }
    } catch (err) {
      errors.push({ legoId: item.legoId, error: err.message })
      return null
    }
  }

  // Process items with limited concurrency
  let processed = 0
  for (let i = 0; i < itemsToProcess.length; i += concurrency) {
    const batch = itemsToProcess.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(processOne))

    for (const result of batchResults) {
      if (result) {
        results.set(result.legoId, result.uuid)
      }
    }

    processed += batch.length
    if (processed % 10 === 0 || processed === itemsToProcess.length) {
      console.error(`    Processed ${processed}/${itemsToProcess.length}...`)
    }
  }

  // Clean up download directory
  fs.rmSync(downloadDir, { recursive: true, force: true })

  // Report summary
  console.error(`\n  Combined presentation summary:`)
  console.error(`    Successful: ${results.size}`)
  console.error(`    Skipped (missing audio): ${skipped.length}`)
  console.error(`    Failed: ${errors.length}`)

  if (skipped.length > 0 && skipped.length <= 10) {
    console.error(`    Skipped items:`)
    for (const s of skipped) {
      console.error(`      ${s.legoId}: missing ${s.missing.join(', ')}`)
    }
  } else if (skipped.length > 10) {
    console.error(`    First 10 skipped:`)
    for (const s of skipped.slice(0, 10)) {
      console.error(`      ${s.legoId}: missing ${s.missing.join(', ')}`)
    }
  }

  if (errors.length > 0) {
    console.error(`    Errors:`)
    for (const e of errors.slice(0, 5)) {
      console.error(`      ${e.legoId}: ${e.error}`)
    }
  }

  return results
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

async function generateLegacyManifest(courseCode, options = {}) {
  const { withAudio = false, dryRun = false, limit = 0, concurrency = 8 } = options
  console.error(`Generating legacy manifest for ${courseCode}...`)
  if (withAudio) {
    console.error(`  (with combined presentation audio generation, dryRun=${dryRun}, limit=${limit || 'all'})`)
  }

  // 1. Load course metadata
  const course = await supabaseClient.getCourse(courseCode)
  if (!course) {
    throw new Error(`Course not found: ${courseCode}`)
  }

  const targetLang = course.target_lang
  const knownLang = course.known_lang
  const targetLangName = getLanguageName(targetLang)

  console.error(`  Target: ${targetLang} (${targetLangName}), Known: ${knownLang}`)

  // 2. Load data from database
  const [dbSeeds, dbLegos, dbPhrases, dbAudio] = await Promise.all([
    loadSeedsFromDB(courseCode),
    loadLegosFromDB(courseCode),
    loadPracticePhrasesFromDB(courseCode),
    loadAudioFromDB(courseCode)
  ])

  console.error(`  Database: ${dbSeeds?.length || 0} seeds, ${dbLegos?.length || 0} LEGOs, ${dbPhrases?.length || 0} phrases, ${dbAudio?.length || 0} audio`)

  // 3. Load welcome and encouragements from database
  const { welcome, instructions, encouragements: encouragementsList } = await loadWelcomeAndEncouragements(courseCode)
  console.error(`  Welcome: ${welcome ? 'found' : 'missing'}, Instructions: ${instructions.length}, Encouragements: ${encouragementsList.length}`)

  // 5. Build lookup maps from database
  const legoMap = new Map() // seed_number -> legos[]
  const phraseMap = new Map() // `${seed_number}-${lego_index}` -> phrases[]

  if (dbLegos) {
    for (const lego of dbLegos) {
      const key = lego.seed_number
      if (!legoMap.has(key)) legoMap.set(key, [])
      legoMap.get(key).push(lego)
    }
  }

  if (dbPhrases) {
    for (const phrase of dbPhrases) {
      const key = `${phrase.seed_number}-${phrase.lego_index}`
      if (!phraseMap.has(key)) phraseMap.set(key, [])
      phraseMap.get(key).push(phrase)
    }
  }

  // 6. Build seed map from DB ONLY (no file fallback)
  const seedMap = new Map() // seed_number -> { known_text, target_text }

  if (dbSeeds && dbSeeds.length > 0) {
    for (const seed of dbSeeds) {
      seedMap.set(seed.seed_number, seed)
    }
  }

  // NOTE: We no longer fill gaps from lego_pairs.json
  // Only database seeds are included to ensure data consistency

  console.error(`  Database seeds: ${seedMap.size}`)

  // 7. Collect all texts and build seeds
  const allTexts = new Set()
  const addText = (text, isKnown) => {
    if (text) allTexts.add(JSON.stringify({ text, isKnown }))
  }

  // Collect introduction items for combined audio generation
  const introItems = []

  const seeds = []
  const seedNumbers = Array.from(seedMap.keys()).sort((a, b) => a - b)

  for (const seedNum of seedNumbers) {
    const seedData = seedMap.get(seedNum)
    const seedId = seedData.seed_id || `S${String(seedNum).padStart(4, '0')}`

    addText(seedData.known_text, true)
    addText(seedData.target_text, false)

    const seedUUID = generateTextUUID(`${seedId}-SEED`)

    const seed = {
      id: seedUUID,
      seed_sentence: { canonical: seedData.known_text },
      node: buildNode(seedUUID, seedData.known_text, seedData.target_text),
      introduction_items: []
    }

    // Get LEGOs for this seed
    const legos = legoMap.get(seedNum) || []

    for (const lego of legos) {
      // Only include new LEGOs
      if (!lego.is_new) continue

      addText(lego.known_text, true)
      addText(lego.target_text, false)

      const legoUUID = generateTextUUID(`${lego.lego_id}-LEGO`)

      // Get practice phrases for this LEGO
      const phrases = phraseMap.get(`${seedNum}-${lego.lego_index}`) || []
      const nodes = []

      for (const phrase of phrases) {
        // Skip component phrases (build-up for M-type LEGOs)
        if (phrase.phrase_role === 'component') continue

        // Skip debut phrase (the LEGO itself, used in introduction not practice)
        const isDebut = phrase.target_text.toLowerCase().trim() === lego.target_text.toLowerCase().trim()
        if (isDebut) continue

        addText(phrase.known_text, true)
        addText(phrase.target_text, false)
        const phraseUUID = generateTextUUID(`${lego.lego_id}-W${phrase.word_count}-${phrase.known_text}`)
        nodes.push(buildNode(phraseUUID, phrase.known_text, phrase.target_text))
      }

      const presentationText = buildPresentation(lego.known_text, lego.target_text, targetLangName)

      const introItem = {
        id: legoUUID,
        node: buildNode(legoUUID, lego.known_text, lego.target_text),
        nodes,
        presentation: presentationText
      }

      // Collect for combined audio generation
      introItems.push({
        legoId: lego.lego_id,
        legoUUID,
        knownText: lego.known_text,
        targetText: lego.target_text,
        presentation: presentationText
      })

      seed.introduction_items.push(introItem)
    }

    seeds.push(seed)

    if (seeds.length % 100 === 0) {
      console.error(`  Processed ${seeds.length} seeds...`)
    }
  }

  console.error(`  Built ${seeds.length} seeds with introduction items`)

  // 8. Build samples dictionary
  const textsArray = Array.from(allTexts).map(s => JSON.parse(s))
  console.error(`  Collected ${textsArray.length} unique texts for samples`)
  const samples = buildSamplesDictionary(dbAudio, textsArray, knownLang, targetLang)
  console.error(`  Built samples dictionary with ${Object.keys(samples).length} entries`)

  // 8.5. Generate combined presentation audio if requested
  let combinedPresentationMap = new Map()
  if (withAudio && introItems.length > 0) {
    console.error(`  Collected ${introItems.length} introduction items for combined audio`)

    // Build audio lookup map: (text_normalized|language|role) -> record
    const audioLookup = new Map()
    // Build presentation lookup map: lego_id -> record (presentation audio uses lego_id)
    const presentationByLegoId = new Map()
    if (dbAudio) {
      for (const record of dbAudio) {
        // For presentation role, index by lego_id
        if (record.role === 'presentation' && record.lego_id) {
          presentationByLegoId.set(record.lego_id, record)
        }
        // Also index by text for target1/target2 lookup
        const key = `${record.text_normalized}|${record.language}|${record.role}`
        audioLookup.set(key, record)
      }
    }
    console.error(`  Audio lookup: ${audioLookup.size} by text, ${presentationByLegoId.size} presentations by lego_id`)

    combinedPresentationMap = await generateCombinedPresentations(
      courseCode,
      introItems,
      audioLookup,
      presentationByLegoId,
      targetLang,
      knownLang,
      { dryRun, limit, concurrency }
    )

    // Add combined presentation audio to samples dictionary
    // The legacy app looks these up by presentation text
    for (const item of introItems) {
      const combinedUuid = combinedPresentationMap.get(item.legoId)
      if (combinedUuid) {
        // Add entry for this presentation text with role 'presentation'
        // This is a combined file: narration + pause + target1 + pause + target2
        samples[item.presentation] = [{
          id: combinedUuid,
          role: 'presentation',
          cadence: 'natural',
          duration: 0  // Could calculate from components but not essential
        }]
      }
    }

    console.error(`  Added ${combinedPresentationMap.size} combined presentations to samples`)
  }

  // 9. Build introduction from welcome audio
  const introduction = welcome && welcome.s3_key ? {
    id: uuidFromS3Key(welcome.s3_key),
    cadence: 'natural',
    role: 'presentation',
    duration: welcome.duration_ms ? welcome.duration_ms / 1000 : 0
  } : PLACEHOLDER_INTRO

  // 10. Format encouragements for legacy manifest
  // orderedEncouragements = instructions (played in sequence)
  // pooledEncouragements = encouragements (played randomly)
  const orderedEncouragements = instructions.map(item => ({
    text: item.text,
    id: uuidFromS3Key(item.s3_key)
  })).filter(item => item.id) // Filter out any without valid s3_key

  const pooledEncouragements = encouragementsList.map(item => ({
    text: item.text,
    id: uuidFromS3Key(item.s3_key)
  })).filter(item => item.id) // Filter out any without valid s3_key

  // 11. Add encouragement/instruction audio to samples dictionary
  for (const item of instructions) {
    if (item.text && item.s3_key) {
      samples[item.text] = [{
        id: uuidFromS3Key(item.s3_key),
        cadence: 'natural',
        role: 'presentation',
        duration: item.duration_ms ? item.duration_ms / 1000 : 0
      }]
    }
  }

  for (const item of encouragementsList) {
    if (item.text && item.s3_key) {
      samples[item.text] = [{
        id: uuidFromS3Key(item.s3_key),
        cadence: 'natural',
        role: 'presentation',
        duration: item.duration_ms ? item.duration_ms / 1000 : 0
      }]
    }
  }

  // 12. Build manifest
  const manifestId = `${LANG_MAP[knownLang] || knownLang}-${LANG_MAP[targetLang] || targetLang}`

  const manifest = {
    id: manifestId,
    known: LANG_MAP[knownLang] || knownLang,
    target: LANG_MAP[targetLang] || targetLang,
    version: '5.0.0',
    status: 'published',
    introduction,
    slices: [{
      id: generateSliceUUID(),
      version: '1.0.0',
      seeds,
      samples,
      orderedEncouragements,
      pooledEncouragements
    }]
  }

  console.error(`  Generated manifest: ${manifestId}`)
  console.error(`  Total seeds: ${seeds.length}`)
  console.error(`  Samples: ${Object.keys(samples).length}`)
  console.error(`  Encouragements: ${orderedEncouragements.length} ordered, ${pooledEncouragements.length} pooled`)

  return manifest
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node generate-legacy-manifest.cjs <courseCode> [outputFile] [options]')
    console.error('  courseCode: e.g., spa_for_eng, ita_for_eng')
    console.error('  outputFile: optional, defaults to stdout')
    console.error('')
    console.error('Options:')
    console.error('  --with-audio      Generate combined presentation audio (narration + targets)')
    console.error('  --dry-run         Preview audio generation without creating files')
    console.error('  --limit N         Only process first N presentations (for testing)')
    console.error('  --concurrency N   Parallel audio jobs (default: 8)')
    console.error('')
    console.error('Examples:')
    console.error('  node generate-legacy-manifest.cjs ita_for_eng')
    console.error('  node generate-legacy-manifest.cjs ita_for_eng output.json')
    console.error('  node generate-legacy-manifest.cjs ita_for_eng --with-audio --dry-run')
    console.error('  node generate-legacy-manifest.cjs ita_for_eng --with-audio --limit 10')
    console.error('  node generate-legacy-manifest.cjs ita_for_eng --with-audio --concurrency 4  # slower but lighter')
    console.error('  node generate-legacy-manifest.cjs ita_for_eng output.json --with-audio')
    process.exit(1)
  }

  // Parse arguments
  const courseCode = args[0]
  let outputFile = null
  let withAudio = false
  let dryRun = false
  let limit = 0
  let concurrency = 8

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--with-audio') {
      withAudio = true
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--limit') {
      limit = parseInt(args[++i], 10) || 0
    } else if (arg === '--concurrency') {
      concurrency = parseInt(args[++i], 10) || 4
    } else if (!arg.startsWith('--')) {
      outputFile = arg
    }
  }

  try {
    const manifest = await generateLegacyManifest(courseCode, { withAudio, dryRun, limit, concurrency })
    const json = JSON.stringify(manifest, null, 2)

    if (outputFile) {
      fs.writeFileSync(outputFile, json)
      console.error(`Written to ${outputFile}`)
    } else {
      console.log(json)
    }
  } catch (err) {
    console.error('Error:', err.message)
    if (process.env.DEBUG) {
      console.error(err.stack)
    }
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { generateLegacyManifest }
