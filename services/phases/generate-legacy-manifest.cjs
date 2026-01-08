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
 *   node generate-legacy-manifest.cjs <courseCode>
 *   node generate-legacy-manifest.cjs spa_for_eng
 */

const path = require('path')
const fs = require('fs')
const { v4: uuidv4, v5: uuidv5 } = require('uuid')

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const supabaseClient = require('../supabase-client.cjs')

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

// Placeholder intro audio (Kai has the actual files)
const PLACEHOLDER_INTRO = {
  id: '00000000-0000-0000-0000-000000000001',
  cadence: 'natural',
  role: 'presentation',
  duration: 45.0
}

// =============================================================================
// DATABASE LOADERS
// =============================================================================

/**
 * Load seeds from database
 */
async function loadSeedsFromDB(courseCode) {
  const client = supabaseClient.getClient()
  if (!client) return null

  const { data, error } = await client
    .from('course_seeds')
    .select('seed_number, seed_id, known_text, target_text')
    .eq('course_code', courseCode)
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
    .select('seed_number, lego_index, word_count, known_text, target_text, position')
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
    .select('id, text, text_normalized, language, role, duration_ms')
    .eq('course_code', courseCode)

  if (error) {
    console.error('  Warning: Could not load audio from DB:', error.message)
    return null
  }

  return data
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
// MAIN GENERATOR
// =============================================================================

async function generateLegacyManifest(courseCode) {
  console.error(`Generating legacy manifest for ${courseCode}...`)

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

  // 3. Load encouragements (from canonical file)
  const encouragements = loadEncouragements()

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
        addText(phrase.known_text, true)
        addText(phrase.target_text, false)
        const phraseUUID = generateTextUUID(`${lego.lego_id}-W${phrase.word_count}-${phrase.known_text}`)
        nodes.push(buildNode(phraseUUID, phrase.known_text, phrase.target_text))
      }

      const introItem = {
        id: legoUUID,
        node: buildNode(legoUUID, lego.known_text, lego.target_text),
        nodes,
        presentation: buildPresentation(lego.known_text, lego.target_text, targetLangName)
      }

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

  // 9. Build manifest
  const manifestId = `${LANG_MAP[knownLang] || knownLang}-${LANG_MAP[targetLang] || targetLang}`

  const manifest = {
    id: manifestId,
    known: LANG_MAP[knownLang] || knownLang,
    target: LANG_MAP[targetLang] || targetLang,
    version: '5.0.0',
    status: 'published',
    introduction: PLACEHOLDER_INTRO,
    slices: [{
      id: generateSliceUUID(),
      version: '1.0.0',
      seeds,
      samples,
      orderedEncouragements: encouragements.orderedEncouragements || [],
      pooledEncouragements: encouragements.pooledEncouragements || []
    }]
  }

  console.error(`  Generated manifest: ${manifestId}`)
  console.error(`  Total seeds: ${seeds.length}`)
  console.error(`  Samples: ${Object.keys(samples).length}`)
  console.error(`  Encouragements: ${manifest.slices[0].orderedEncouragements.length} ordered, ${manifest.slices[0].pooledEncouragements.length} pooled`)

  return manifest
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node generate-legacy-manifest.cjs <courseCode> [outputFile]')
    console.error('  courseCode: e.g., spa_for_eng')
    console.error('  outputFile: optional, defaults to stdout')
    process.exit(1)
  }

  const courseCode = args[0]
  const outputFile = args[1]

  try {
    const manifest = await generateLegacyManifest(courseCode)
    const json = JSON.stringify(manifest, null, 2)

    if (outputFile) {
      fs.writeFileSync(outputFile, json)
      console.error(`Written to ${outputFile}`)
    } else {
      console.log(json)
    }
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { generateLegacyManifest }
