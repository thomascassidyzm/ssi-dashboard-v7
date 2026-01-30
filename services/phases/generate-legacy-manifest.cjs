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

// =============================================================================
// TEXT NORMALIZATION (for audio matching)
// Must match phase8-audio-v13.cjs normalization for consistent audio lookup
// =============================================================================

// Punctuation to strip when comparing text for audio matching
const PUNCT_REGEX = /[。？！、，.!?,;:()（）「」『』\[\]…—–\-]+/g

/**
 * Normalize text for audio matching comparison
 * Strips punctuation, lowercases, and trims - used when comparing
 * phrase text against existing audio records.
 *
 * MUST match the normalizeText() function in phase8-audio-v13.cjs
 */
function normalizeTextForAudio(text) {
  if (!text) return ''
  return text.toLowerCase().replace(PUNCT_REGEX, '').trim()
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

  // Paginate to get ALL audio records (Supabase default limit is 1000-50000)
  const PAGE_SIZE = 50000
  let allData = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await client
      .from('course_audio')
      .select('id, text, text_normalized, language, role, duration_ms, lego_id, s3_key')
      .eq('course_code', courseCode)
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('  Warning: Could not load audio from DB:', error.message)
      return allData.length > 0 ? allData : null
    }

    if (data && data.length > 0) {
      allData = allData.concat(data)
      offset += PAGE_SIZE
      hasMore = data.length === PAGE_SIZE
    } else {
      hasMore = false
    }
  }

  return allData
}

/**
 * Load welcome, instructions, and encouragements from database
 */
async function loadWelcomeAndEncouragements(courseCode, knownLang) {
  const client = supabaseClient.getClient()
  if (!client) return { welcome: null, instructions: [], encouragements: [] }

  // Load welcome (course-specific, stored in course_audio)
  const { data: welcomeData } = await client
    .from('course_audio')
    .select('id, text, s3_key, duration_ms')
    .eq('course_code', courseCode)
    .eq('role', 'welcome')
    .limit(1)

  // Load instructions (orderedEncouragements) from shared_audio
  // Instructions are shared across courses with the same known language
  const { data: instructionsData } = await client
    .from('shared_audio')
    .select('id, text, s3_key, duration_ms')
    .eq('language', knownLang)
    .eq('audio_type', 'instruction')
    .order('text')  // Consistent ordering

  // Load encouragements (pooledEncouragements) from shared_audio
  // Encouragements are shared across courses with the same known language
  const { data: encouragementsData } = await client
    .from('shared_audio')
    .select('id, text, s3_key, duration_ms')
    .eq('language', knownLang)
    .eq('audio_type', 'encouragement')

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

function generateSliceUUID(courseCode) {
  // Deterministic slice UUID based on course code
  return uuidv5(`${courseCode}-SLICE`, NAMESPACE).toUpperCase()
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
// MANIFEST VALIDATION & CLEANUP
// =============================================================================

/**
 * Generate a unique key for a node based on known and target text.
 */
function nodeKey(node) {
  // Case-insensitive matching - normalize to lowercase for duplicate detection
  return `${node.known.text.toLowerCase().trim()}|${node.target.text.toLowerCase().trim()}`
}

/**
 * Check for missing samples - any text referenced but not in samples dict.
 * This is CRITICAL - if any are missing, the export is broken.
 */
function checkMissingSamples(seeds, samples) {
  const missing = []

  for (const seed of seeds) {
    // Check seed node
    const seedKnown = seed.node.known.text
    const seedTarget = seed.node.target.text
    if (!samples[seedKnown]) missing.push({ text: seedKnown, type: 'seed_known', seedId: seed.id })
    if (!samples[seedTarget]) missing.push({ text: seedTarget, type: 'seed_target', seedId: seed.id })

    // Check introduction items
    for (const intro of seed.introduction_items || []) {
      // Intro node
      if (intro.node) {
        if (!samples[intro.node.known.text]) missing.push({ text: intro.node.known.text, type: 'intro_known', introId: intro.id })
        if (!samples[intro.node.target.text]) missing.push({ text: intro.node.target.text, type: 'intro_target', introId: intro.id })
      }
      // Child nodes
      for (const node of intro.nodes || []) {
        if (!samples[node.known.text]) missing.push({ text: node.known.text, type: 'node_known', introId: intro.id })
        if (!samples[node.target.text]) missing.push({ text: node.target.text, type: 'node_target', introId: intro.id })
      }
      // Presentation (combined audio) - checked separately if --with-audio
    }
  }

  return missing
}

/**
 * Find duplicate nodes within introduction items.
 * A node is duplicate if its (known, target) matches:
 * - Any seed node
 * - Any intro item node
 * - Any earlier node in the manifest
 */
function findDuplicateNodes(seeds) {
  const duplicates = []
  const seedNodes = new Set()
  const introItemNodes = new Set()
  const allNodesSeen = new Set()

  // First pass: collect all seed nodes and intro item nodes
  for (const seed of seeds) {
    if (seed.node) seedNodes.add(nodeKey(seed.node))
    for (const intro of seed.introduction_items || []) {
      if (intro.node) introItemNodes.add(nodeKey(intro.node))
    }
  }

  // Second pass: find duplicates in child nodes
  for (const seed of seeds) {
    for (const intro of seed.introduction_items || []) {
      // Check if intro item itself is duplicate of earlier intro
      if (intro.node) {
        const key = nodeKey(intro.node)
        if (allNodesSeen.has(key)) {
          duplicates.push({ type: 'intro_duplicate', introId: intro.id, key })
        }
        allNodesSeen.add(key)
      }

      // Check child nodes
      for (const node of intro.nodes || []) {
        const key = nodeKey(node)
        if (seedNodes.has(key)) {
          duplicates.push({ type: 'node_matches_seed', introId: intro.id, nodeId: node.id, key })
        } else if (introItemNodes.has(key)) {
          duplicates.push({ type: 'node_matches_intro', introId: intro.id, nodeId: node.id, key })
        } else if (allNodesSeen.has(key)) {
          duplicates.push({ type: 'node_matches_earlier', introId: intro.id, nodeId: node.id, key })
        }
        allNodesSeen.add(key)
      }
    }
  }

  return duplicates
}

/**
 * Remove duplicate nodes from introduction items.
 */
function removeDuplicateNodes(seeds) {
  const seedNodes = new Set()
  const introItemNodes = new Set()
  const allNodesSeen = new Set()
  let removedCount = 0

  // First pass: collect all seed nodes and intro item nodes
  for (const seed of seeds) {
    if (seed.node) seedNodes.add(nodeKey(seed.node))
    for (const intro of seed.introduction_items || []) {
      if (intro.node) introItemNodes.add(nodeKey(intro.node))
    }
  }

  // Second pass: remove duplicate intro items and their child nodes
  const allIntrosSeen = new Set() // Track intro items separately for intro-to-intro deduplication

  for (const seed of seeds) {
    const filteredIntros = []

    for (const intro of seed.introduction_items || []) {
      // Check if this intro item is a duplicate of an EARLIER intro item
      if (intro.node) {
        const key = nodeKey(intro.node)
        if (allIntrosSeen.has(key)) {
          // This intro duplicates an earlier intro - skip it entirely
          removedCount++
          continue
        }
        allIntrosSeen.add(key)
        allNodesSeen.add(key) // Also track in allNodesSeen for child node checking
      }

      // Filter child nodes (practice phrases)
      // Child nodes are removed if they match ANY seed, ANY intro, or an earlier child node
      if (intro.nodes) {
        const filteredNodes = []
        for (const node of intro.nodes) {
          const key = nodeKey(node)
          if (!seedNodes.has(key) && !introItemNodes.has(key) && !allNodesSeen.has(key)) {
            filteredNodes.push(node)
            allNodesSeen.add(key)
          } else {
            removedCount++
          }
        }
        intro.nodes = filteredNodes
      }

      // Keep this intro (it's not a duplicate of an earlier intro)
      filteredIntros.push(intro)
    }

    // Replace introduction_items with filtered list
    seed.introduction_items = filteredIntros
  }

  return removedCount
}

/**
 * Find seeds with duplicate canonical text.
 */
function findDuplicateSeedCanonicals(seeds) {
  const duplicates = []
  const seenCanonicals = new Map() // canonical (normalized) -> seedId

  for (const seed of seeds) {
    const canonical = seed.seed_sentence?.canonical
    if (canonical) {
      // Case-insensitive matching
      const normalizedCanonical = canonical.toLowerCase().trim()
      if (seenCanonicals.has(normalizedCanonical)) {
        duplicates.push({
          originalId: seenCanonicals.get(normalizedCanonical),
          duplicateId: seed.id,
          canonical
        })
      } else {
        seenCanonicals.set(normalizedCanonical, seed.id)
      }
    }
  }

  return duplicates
}

/**
 * Remove seeds with duplicate canonical text (keeps first occurrence).
 */
function removeDuplicateSeedCanonicals(seeds) {
  const seenCanonicals = new Set() // normalized canonicals
  const filtered = []
  let removedCount = 0

  for (const seed of seeds) {
    const canonical = seed.seed_sentence?.canonical
    // Case-insensitive matching
    const normalizedCanonical = canonical?.toLowerCase().trim()
    if (!normalizedCanonical || !seenCanonicals.has(normalizedCanonical)) {
      if (normalizedCanonical) seenCanonicals.add(normalizedCanonical)
      filtered.push(seed)
    } else {
      removedCount++
    }
  }

  return { seeds: filtered, removedCount }
}

/**
 * Find empty seeds (no introduction_items).
 */
function findEmptySeeds(seeds) {
  return seeds.filter(s => !s.introduction_items || s.introduction_items.length === 0)
    .map(s => ({ id: s.id, canonical: s.seed_sentence?.canonical }))
}

/**
 * Remove empty seeds.
 */
function removeEmptySeeds(seeds) {
  const filtered = seeds.filter(s => s.introduction_items && s.introduction_items.length > 0)
  return { seeds: filtered, removedCount: seeds.length - filtered.length }
}

/**
 * Find orphan samples (samples not referenced by any content).
 */
function findOrphanSamples(seeds, samples, encouragements) {
  const referencedTexts = new Set()

  // Collect all referenced texts from seeds
  for (const seed of seeds) {
    if (seed.node) {
      referencedTexts.add(seed.node.known.text)
      referencedTexts.add(seed.node.target.text)
    }
    for (const intro of seed.introduction_items || []) {
      if (intro.node) {
        referencedTexts.add(intro.node.known.text)
        referencedTexts.add(intro.node.target.text)
      }
      for (const node of intro.nodes || []) {
        referencedTexts.add(node.known.text)
        referencedTexts.add(node.target.text)
      }
      if (intro.presentation) referencedTexts.add(intro.presentation)
    }
  }

  // Add encouragements
  for (const enc of encouragements || []) {
    if (enc.text) referencedTexts.add(enc.text)
  }

  // Find orphans
  const orphans = []
  for (const text of Object.keys(samples)) {
    if (!referencedTexts.has(text)) {
      orphans.push(text)
    }
  }

  return orphans
}

/**
 * Remove orphan samples.
 */
function removeOrphanSamples(samples, orphans) {
  for (const text of orphans) {
    delete samples[text]
  }
  return orphans.length
}

/**
 * Run all validations and cleanup. Returns stats object.
 */
function validateAndCleanManifest(seeds, samples, encouragements) {
  const stats = { pass: 1 }

  // Pass 1 (and potentially pass 2 for verification)
  while (true) {
    console.error(`\n  === Validation Pass ${stats.pass} ===`)
    let hasIssues = false

    // 1. Check missing samples (CRITICAL)
    const missing = checkMissingSamples(seeds, samples)
    if (missing.length > 0) {
      console.error(`  CRITICAL: ${missing.length} missing samples!`)
      missing.slice(0, 5).forEach(m => console.error(`    - ${m.type}: "${m.text.substring(0, 50)}..."`))
      throw new Error(`Legacy export broken: ${missing.length} texts have no sample entry`)
    }
    console.error(`  ✓ No missing samples`)

    // 2. Check/remove duplicate nodes
    const dupNodes = findDuplicateNodes(seeds)
    if (dupNodes.length > 0) {
      console.error(`  Found ${dupNodes.length} duplicate nodes, removing...`)
      const removed = removeDuplicateNodes(seeds)
      console.error(`  ✓ Removed ${removed} duplicate nodes`)
      hasIssues = true
    } else {
      console.error(`  ✓ No duplicate nodes`)
    }

    // 3. Check/remove duplicate seed canonicals
    const dupSeeds = findDuplicateSeedCanonicals(seeds)
    if (dupSeeds.length > 0) {
      console.error(`  Found ${dupSeeds.length} duplicate seed canonicals, removing...`)
      const result = removeDuplicateSeedCanonicals(seeds)
      seeds.length = 0
      seeds.push(...result.seeds)
      console.error(`  ✓ Removed ${result.removedCount} duplicate seeds`)
      hasIssues = true
    } else {
      console.error(`  ✓ No duplicate seed canonicals`)
    }

    // 4. Check/remove empty seeds
    const emptySeeds = findEmptySeeds(seeds)
    if (emptySeeds.length > 0) {
      console.error(`  Found ${emptySeeds.length} empty seeds, removing...`)
      const result = removeEmptySeeds(seeds)
      seeds.length = 0
      seeds.push(...result.seeds)
      console.error(`  ✓ Removed ${result.removedCount} empty seeds`)
      hasIssues = true
    } else {
      console.error(`  ✓ No empty seeds`)
    }

    // 5. Check/remove orphan samples (last)
    const orphans = findOrphanSamples(seeds, samples, encouragements)
    if (orphans.length > 0) {
      console.error(`  Found ${orphans.length} orphan samples, removing...`)
      const removed = removeOrphanSamples(samples, orphans)
      console.error(`  ✓ Removed ${removed} orphan samples`)
      hasIssues = true
    } else {
      console.error(`  ✓ No orphan samples`)
    }

    // If no issues found, we're done
    if (!hasIssues) {
      console.error(`  ✓ All validations passed!`)
      break
    }

    // Otherwise, run another pass to verify fixes didn't create new issues
    stats.pass++
    if (stats.pass > 3) {
      throw new Error('Validation loop: issues keep reappearing after 3 passes')
    }
  }

  return stats
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
  // Use punctuation-stripped normalization to match phase 8 audio generation
  const audioLookup = new Map()
  for (const record of audioRecords) {
    // Normalize the stored text_normalized to strip punctuation (matching phase8 logic)
    const normalizedKey = normalizeTextForAudio(record.text_normalized)
    const key = `${normalizedKey}|${record.language}|${record.role}`
    audioLookup.set(key, record)
  }

  // Process each unique text
  for (const { text, isKnown } of allTexts) {
    if (!text) continue

    // Use punctuation-stripped normalization to match the lookup keys
    const normalizedText = normalizeTextForAudio(text)
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
        // Use the UUID from s3_key, not the database id
        const audioUuid = uuidFromS3Key(record.s3_key)
        if (audioUuid) {
          sampleEntries.push({
            id: audioUuid.toUpperCase(),
            role: legacyRole,
            cadence,
            duration: record.duration_ms ? record.duration_ms / 1000 : 0
          })
        }
      }
    }

    if (sampleEntries.length > 0) {
      // Merge with existing entries instead of overwriting
      // This handles cases where known and target text are identical (e.g., "no", "in", "so")
      if (samples[text]) {
        samples[text] = [...samples[text], ...sampleEntries]
      } else {
        samples[text] = sampleEntries
      }
      // Also add without trailing period
      if (text.endsWith('.')) {
        const textWithoutPeriod = text.slice(0, -1)
        if (samples[textWithoutPeriod]) {
          samples[textWithoutPeriod] = [...samples[textWithoutPeriod], ...sampleEntries]
        } else {
          samples[textWithoutPeriod] = sampleEntries
        }
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
  const { dryRun = false, limit = 0, concurrency = 2, onProgress = null, shouldCancel = null } = options
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

  // DEBUG: Track uploads
  let uploadCount = 0

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

    let presRecord = presentationByLegoId.get(item.legoId)

    // Fallback: If lego_id lookup fails, try finding by known_text
    // Presentation audio doesn't include target, so same known_text can be shared
    if (!presRecord) {
      const normalizedKnown = item.knownText.toLowerCase().trim()
      // Search audioLookup for a presentation matching this known_text
      for (const [key, record] of audioLookup) {
        if (record.role === 'presentation') {
          // Extract known_text from presentation: "The French for 'KNOWN', is:"
          const match = record.text_normalized?.match(/for '(.+?)'(?:, as in|, is:)/)
          if (match && match[1].toLowerCase().trim() === normalizedKnown) {
            presRecord = record
            break
          }
        }
      }
    }

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

      // DEBUG: Log first few uploads
      uploadCount++
      if (uploadCount <= 3) {
        console.error(`  [DEBUG] Combined upload #${uploadCount}: ${combinedUuid} → ${audioBucket}/mastered/${combinedUuid}.mp3`)
        console.error(`         Presentation text: ${item.presentation.substring(0, 80)}...`)
      }

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
    // Check for cancellation
    if (shouldCancel && shouldCancel()) {
      console.error(`    Cancelled at ${processed}/${itemsToProcess.length}`)
      break
    }

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

    // Call progress callback
    if (onProgress) {
      onProgress(processed, itemsToProcess.length)
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

  return { results, errors, skipped }
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
  const { welcome, instructions, encouragements: encouragementsList } = await loadWelcomeAndEncouragements(courseCode, knownLang)
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

  // 8.1. Add encouragement/instruction samples BEFORE validation
  // This ensures they're included in the orphan check
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
  console.error(`  Added ${instructions.length + encouragementsList.length} encouragement samples`)

  // 8.2. Add placeholder presentation samples BEFORE validation
  // Uses deterministic UUIDs so they match what will be generated later
  // This allows the manifest to be valid immediately (for download)
  // while combined audio generation happens in background
  for (const item of introItems) {
    const combinedUuid = uuidService.generateSampleUUID(
      item.presentation,
      knownLang,
      'presentation_combined',
      'natural',
      'combined'
    )
    samples[item.presentation] = [{
      id: combinedUuid,
      role: 'presentation',
      cadence: 'natural',
      duration: 0  // Unknown until generated
    }]
  }
  console.error(`  Added ${introItems.length} placeholder presentation samples`)

  // 8.3. Validate and clean manifest
  // All samples (content + encouragements + presentations) are now in the dict
  const allEncouragements = [...instructions, ...encouragementsList]
  validateAndCleanManifest(seeds, samples, allEncouragements)

  // 8.4. Filter introItems to only include items from remaining seeds
  // (seeds may have been removed during validation)
  const remainingSeedIntroIds = new Set()
  for (const seed of seeds) {
    for (const intro of seed.introduction_items || []) {
      remainingSeedIntroIds.add(intro.id)
    }
  }
  const originalIntroCount = introItems.length
  const validIntroItems = introItems.filter(item => remainingSeedIntroIds.has(item.legoUUID))
  if (validIntroItems.length < originalIntroCount) {
    console.error(`  Filtered intro items: ${validIntroItems.length} (removed ${originalIntroCount - validIntroItems.length} from cleaned seeds)`)
  }
  introItems.length = 0
  introItems.push(...validIntroItems)

  // 8.5. Generate combined presentation audio if requested
  // This happens AFTER validation - manifest is already valid for download
  // Combined audio generation can run in background with progress updates
  if (withAudio && introItems.length > 0) {
    console.error(`\n  Generating combined presentation audio (${introItems.length} items)...`)

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

    const combinedPresentationMap = await generateCombinedPresentations(
      courseCode,
      introItems,
      audioLookup,
      presentationByLegoId,
      targetLang,
      knownLang,
      { dryRun, limit, concurrency }
    )

    // Update presentation samples with actual durations (UUIDs already match)
    let updatedCount = 0
    for (const item of introItems) {
      const combinedUuid = combinedPresentationMap.get(item.legoId)
      if (combinedUuid && samples[item.presentation]) {
        // UUID should already match, but verify
        const existingUuid = samples[item.presentation][0]?.id
        if (existingUuid !== combinedUuid) {
          console.error(`  Warning: UUID mismatch for ${item.legoId}: expected ${existingUuid}, got ${combinedUuid}`)
        }
        updatedCount++
      }
    }
    console.error(`  Verified ${updatedCount} combined presentations`)
  }

  // 9. Build introduction from welcome audio
  const introduction = welcome && welcome.s3_key ? {
    id: uuidFromS3Key(welcome.s3_key),
    cadence: 'natural',
    role: 'presentation',
    duration: welcome.duration_ms ? welcome.duration_ms / 1000 : 0
  } : PLACEHOLDER_INTRO

  if (!welcome || !welcome.s3_key) {
    console.error(`\n⚠️  WARNING: No welcome audio found for ${courseCode}`)
    console.error(`   Using placeholder introduction UUID: ${PLACEHOLDER_INTRO.id}`)
    console.error(`   To fix: Import welcome audio with role='welcome' to course_audio table\n`)
  }

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
      id: generateSliceUUID(courseCode),
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
// MANIFEST VALIDATION
// =============================================================================

/**
 * Validate that a string is a valid UUID (v4 or v5 format)
 */
function isValidUUID(str) {
  if (!str || typeof str !== 'string') return false
  // UUID v4/v5 regex: 8-4-4-4-12 hex characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Recursively find all issues in the manifest:
 * - Invalid UUIDs in `id` fields
 * - Empty strings in text fields
 *
 * @param {any} data - The data to validate
 * @param {string} path - Current path for error reporting
 * @param {object} issues - Accumulator for found issues
 * @returns {object} - { invalidUUIDs: [], emptyStrings: [] }
 */
function findManifestIssues(data, path = '', issues = null) {
  if (!issues) {
    issues = { invalidUUIDs: [], emptyStrings: [] }
  }

  if (data === null || data === undefined) {
    return issues
  }

  if (typeof data === 'string') {
    // Check for empty strings (but not in paths that are expected to be empty sometimes)
    if (data === '' && !path.includes('lemma') && !path.includes('token')) {
      issues.emptyStrings.push(path)
    }
    return issues
  }

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      findManifestIssues(data[i], `${path}[${i}]`, issues)
    }
    return issues
  }

  if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      const currentPath = path ? `${path}.${key}` : key

      // Check ID fields for valid UUIDs
      if (key === 'id' && typeof value === 'string') {
        // Skip the root-level manifest ID (e.g., "en-it") - it's not a UUID
        if (path === '' || currentPath === 'id') {
          // This is the manifest ID, skip
        } else if (!isValidUUID(value)) {
          issues.invalidUUIDs.push({ path: currentPath, value })
        }
      }

      // Check text fields for empty strings
      if (key === 'text' && value === '') {
        issues.emptyStrings.push(currentPath)
      }

      // Recurse into nested objects/arrays
      findManifestIssues(value, currentPath, issues)
    }
  }

  return issues
}

/**
 * Validate the manifest for critical issues
 *
 * @param {object} manifest - The generated manifest
 * @returns {object} - { valid: boolean, issues: { invalidUUIDs: [], emptyStrings: [] }, summary: string }
 */
function validateManifest(manifest) {
  const issues = findManifestIssues(manifest)

  const invalidCount = issues.invalidUUIDs.length
  const emptyCount = issues.emptyStrings.length
  const valid = invalidCount === 0 && emptyCount === 0

  let summary = ''
  if (valid) {
    summary = 'Manifest validation passed'
  } else {
    const parts = []
    if (invalidCount > 0) parts.push(`${invalidCount} invalid UUID(s)`)
    if (emptyCount > 0) parts.push(`${emptyCount} empty string(s)`)
    summary = `Manifest validation failed: ${parts.join(', ')}`
  }

  // Log to stderr for CLI usage
  if (invalidCount > 0) {
    console.error(`\n  ⚠️  Invalid UUIDs found (${invalidCount}):`)
    for (const item of issues.invalidUUIDs.slice(0, 10)) {
      console.error(`      ${item.path}: "${item.value}"`)
    }
    if (invalidCount > 10) {
      console.error(`      ... and ${invalidCount - 10} more`)
    }
  }

  if (emptyCount > 0) {
    console.error(`\n  ⚠️  Empty strings found (${emptyCount}):`)
    for (const path of issues.emptyStrings.slice(0, 10)) {
      console.error(`      ${path}`)
    }
    if (emptyCount > 10) {
      console.error(`      ... and ${emptyCount - 10} more`)
    }
  }

  if (valid) {
    console.error(`\n  ✓ Manifest validation passed`)
  }

  return { valid, issues, summary }
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

    // Validate the manifest
    const validation = validateManifest(manifest)
    if (!validation.valid) {
      console.error(`\n  ❌ ${validation.summary}`)
      // Don't fail - still output the manifest so user can inspect it
    }

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

module.exports = {
  generateLegacyManifest,
  generateCombinedPresentations,
  validateManifest,
  getLanguageName,
  buildPresentation
}
