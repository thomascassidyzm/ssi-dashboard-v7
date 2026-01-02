/**
 * Phase 8: Audio Generator Service
 *
 * Generates TTS audio for all unique phrases in lego_baskets.json.
 * Uses Supabase as the source of truth for audio samples.
 *
 * Features:
 * - Extracts unique audio needs from baskets
 * - Checks Supabase to skip existing audio
 * - Generates TTS via Azure or ElevenLabs
 * - Uploads to S3
 * - Records in Supabase
 * - Tracks course audio usage
 * - Reports real-time progress via WebSocket
 * - Generates consolidated introduction audio
 *
 * Port: 3465 (BASE_PORT + 9)
 *
 * @version 2.0.0 - Added consolidated introduction support
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const express = require('express')
const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const os = require('os')
const createLogger = require('../shared/logger.cjs')

const logger = createLogger('Phase8')

const db = require('../supabase-client.cjs')
const audioProcessor = require('../audio-processor.cjs')

// TTS services (may not exist yet - graceful fallback)
let azureTTS, elevenLabsTTS, s3Service

try {
  azureTTS = require('../azure-tts-service.cjs')
} catch (e) {
  logger.warn('Azure TTS service not available')
}

try {
  elevenLabsTTS = require('../elevenlabs-service.cjs')
} catch (e) {
  logger.warn('ElevenLabs service not available')
}

try {
  s3Service = require('../s3-production-service.cjs')
} catch (e) {
  logger.warn('S3 production service not available')
}

const app = express()
const PORT = process.env.PHASE8_PORT || 3465  // Use PHASE8_PORT to avoid conflict with other services

app.use(express.json())

// Active jobs tracking
const activeJobs = new Map()

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

// Language name mapping for introduction generation
const LANGUAGE_NAMES = {
  'ita': 'Italian',
  'spa': 'Spanish',
  'fra': 'French',
  'zho': 'Chinese',
  'cmn': 'Chinese',
  'cym': 'Welsh',
  'gle': 'Irish',
  'eus': 'Basque',
  'mkd': 'Macedonian',
  'deu': 'German',
  'por': 'Portuguese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'rus': 'Russian',
  'ara': 'Arabic',
  'hin': 'Hindi',
  'eng': 'English'
}

function getLanguageName(code) {
  return LANGUAGE_NAMES[code] || code.toUpperCase()
}

/**
 * Generate introduction text for a LEGO
 * Format: "The {targetLang} for '{knownLego}', as in '{knownSeed}', is: ... {target1}'{targetLego}' ... {target2}'{targetLego}'"
 *
 * @param {string} targetLangName - Full language name (e.g., "Spanish")
 * @param {string} knownLego - Known language LEGO text
 * @param {string} targetLego - Target language LEGO text
 * @param {string} knownSeed - Known language seed sentence
 * @returns {string} The introduction presentation text
 */
function generateIntroductionText(targetLangName, knownLego, targetLego, knownSeed) {
  return `The ${targetLangName} for '${knownLego}', as in '${knownSeed}', is: ... {target1}'${targetLego}' ... {target2}'${targetLego}'`
}

/**
 * Pick a random example phrase from the longest practice phrases for a LEGO
 * This makes introductions more varied and interesting
 *
 * @param {Array} phrases - Array of practice phrases for this LEGO
 * @param {number} topN - How many of the longest phrases to choose from (default 5)
 * @returns {string} A randomly selected phrase from the longest ones
 */
function pickVariedExamplePhrase(phrases, topN = 5) {
  if (!phrases || phrases.length === 0) return null

  // Sort by length (longest first)
  const sorted = [...phrases].sort((a, b) => {
    const lenA = (a.known_text || '').length
    const lenB = (b.known_text || '').length
    return lenB - lenA
  })

  // Take top N (or all if fewer than N)
  const candidates = sorted.slice(0, Math.min(topN, sorted.length))

  // Pick randomly from candidates
  const randomIndex = Math.floor(Math.random() * candidates.length)
  return candidates[randomIndex].known_text
}

/**
 * Load introduction data from Supabase and extract audio needs
 * Generates CONSOLIDATED introduction audio (single file per LEGO)
 * Uses varied "as in" phrases from the LEGO's practice basket
 *
 * @param {string} courseCode - Course code
 * @param {string} targetLang - Target language code
 * @param {string} knownLang - Known language code
 * @returns {Promise<Array>} Array of audio needs for consolidated introductions
 */
async function extractIntroductionAudioNeedsFromSupabase(courseCode, targetLang, knownLang) {
  if (!db.isInitialized()) {
    logger.warn('Supabase not initialized, cannot load introductions')
    return []
  }

  const needs = []
  const seen = new Set()

  try {
    const supabase = db.getClient()
    const targetLangName = getLanguageName(targetLang)

    // Get all LEGOs that need introductions (is_new=true)
    const { data: legos, error: legosError } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, target_text, known_text, is_new')
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .order('seed_number')
      .order('lego_index')

    if (legosError) {
      logger.warn(`Error loading LEGOs for introductions: ${legosError.message}`)
      return []
    }

    if (!legos || legos.length === 0) {
      logger.log(`No LEGOs with is_new=true found for ${courseCode}`)
      return []
    }

    // Get ALL practice phrases for varied "as in" examples
    const { data: allPhrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index, known_text, target_text')
      .eq('course_code', courseCode)

    if (phrasesError) {
      logger.warn(`Error loading phrases for introductions: ${phrasesError.message}`)
    }

    // Group phrases by LEGO
    const phrasesByLego = {}
    for (const phrase of allPhrases || []) {
      const key = `${phrase.seed_number}-${phrase.lego_index}`
      if (!phrasesByLego[key]) {
        phrasesByLego[key] = []
      }
      phrasesByLego[key].push(phrase)
    }

    // Get seed sentences as fallback
    const { data: seeds, error: seedsError } = await supabase
      .from('course_seeds')
      .select('seed_number, target_text, known_text')
      .eq('course_code', courseCode)

    if (seedsError) {
      logger.warn(`Error loading seeds for introductions: ${seedsError.message}`)
    }

    const seedLookup = {}
    for (const seed of seeds || []) {
      seedLookup[seed.seed_number] = seed
    }

    // Generate consolidated introduction for each LEGO
    for (const lego of legos) {
      const seedId = 'S' + String(lego.seed_number).padStart(4, '0')
      const legoId = `${seedId}L${String(lego.lego_index).padStart(2, '0')}`
      const phraseKey = `${lego.seed_number}-${lego.lego_index}`

      // Pick a varied "as in" example from longest practice phrases
      const legoPhrases = phrasesByLego[phraseKey] || []
      const variedExample = pickVariedExamplePhrase(legoPhrases, 5)

      // Fallback to seed if no practice phrases
      const seed = seedLookup[lego.seed_number]
      const asInPhrase = variedExample || seed?.known_text || lego.known_text

      // Generate the full introduction text with voice tags
      // Format: "The Spanish for 'I want', as in 'I want to go', is: ... {target1}'quiero' ... {target2}'quiero'"
      const introductionText = generateIntroductionText(
        targetLangName,
        lego.known_text,
        lego.target_text,
        asInPhrase
      )

      // Add as consolidated introduction need
      // This will be processed specially to concatenate narration + target clips
      const introKey = `introduction|${legoId}`
      if (!seen.has(introKey)) {
        seen.add(introKey)
        needs.push({
          text: introductionText,
          lang: knownLang,
          targetLang: targetLang,
          role: 'introduction',
          seedId,
          legoId,
          type: 'consolidated_introduction',
          targetText: lego.target_text,  // The LEGO word for target clips
          knownText: lego.known_text,
          asInPhrase: asInPhrase
        })
      }
    }

    logger.log(`Extracted ${needs.length} consolidated introduction needs from ${legos.length} LEGOs (database)`)
    return needs

  } catch (error) {
    logger.warn(`Failed to extract introduction audio needs: ${error.message}`)
    return []
  }
}

/**
 * Extract phrase audio needs from Supabase (database-first)
 * Queries course_practice_phrases table for all practice phrases
 *
 * @param {string} courseCode
 * @param {string} targetLang
 * @param {string} knownLang
 * @returns {Promise<Array>}
 */
async function extractPhraseAudioNeedsFromSupabase(courseCode, targetLang, knownLang) {
  if (!db.isInitialized()) {
    logger.warn('Supabase not initialized, cannot load practice phrases')
    return []
  }

  const needs = []
  const seen = new Set()

  try {
    const supabase = db.getClient()

    // Get all practice phrases for this course
    const { data: phrases, error } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index, position, known_text, target_text')
      .eq('course_code', courseCode)
      .order('seed_number')
      .order('lego_index')
      .order('position')

    if (error) {
      logger.warn(`Error loading practice phrases: ${error.message}`)
      return []
    }

    if (!phrases || phrases.length === 0) {
      logger.log(`No practice phrases found for ${courseCode}`)
      return []
    }

    // Extract audio needs from each phrase
    for (const phrase of phrases) {
      const seedId = 'S' + String(phrase.seed_number).padStart(4, '0')
      const legoId = `${seedId}L${String(phrase.lego_index).padStart(2, '0')}`

      // Target language samples (target1, target2)
      if (phrase.target_text) {
        const key1 = `${phrase.target_text}|${targetLang}|target1`
        if (!seen.has(key1)) {
          seen.add(key1)
          needs.push({
            text: phrase.target_text,
            lang: targetLang,
            role: 'target1',
            seedId,
            legoId
          })
        }

        const key2 = `${phrase.target_text}|${targetLang}|target2`
        if (!seen.has(key2)) {
          seen.add(key2)
          needs.push({
            text: phrase.target_text,
            lang: targetLang,
            role: 'target2',
            seedId,
            legoId
          })
        }
      }

      // Known language text
      if (phrase.known_text) {
        const key = `${phrase.known_text}|${knownLang}|known`
        if (!seen.has(key)) {
          seen.add(key)
          needs.push({
            text: phrase.known_text,
            lang: knownLang,
            role: 'known',
            seedId,
            legoId
          })
        }
      }
    }

    logger.log(`Extracted ${needs.length} phrase audio needs from ${phrases.length} practice phrases (database)`)
    return needs

  } catch (error) {
    logger.warn(`Failed to extract phrase audio needs: ${error.message}`)
    return []
  }
}

/**
 * Generate consolidated introduction audio
 * Creates a single audio file: narration + pause + target1 + pause + target2
 *
 * @param {Object} need - The introduction need object
 * @param {Object} voiceConfig - Voice configuration { known, target1, target2 }
 * @param {string} courseCode - Course code for tracking
 * @returns {Promise<{audioBuffer: Buffer, uuid: string}>}
 */
async function generateConsolidatedIntroduction(need, voiceConfig, courseCode) {
  const os = require('os')
  const tempDir = path.join(os.tmpdir(), `intro-${need.legoId}-${Date.now()}`)
  await fs.ensureDir(tempDir)

  try {
    // Parse the introduction text to extract parts
    // Format: "The Spanish for 'I want', as in 'I want to go', is: ... {target1}'quiero' ... {target2}'quiero'"
    const text = need.text

    // Extract target text from voice tags
    const target1Match = text.match(/\{target1\}'([^']+)'/)
    const target2Match = text.match(/\{target2\}'([^']+)'/)

    if (!target1Match || !target2Match) {
      throw new Error(`Could not parse target clips from introduction: ${text.substring(0, 100)}`)
    }

    const targetWord = target1Match[1]

    // Extract narration parts (before first target, between targets, after second target)
    // Split on the voice tags
    const parts = text.split(/\{target[12]\}'[^']+'/g)
    const narrationPart1 = parts[0]?.trim() || ''  // "The Spanish for 'I want', as in 'X', is: ..."
    const narrationPart2 = parts[1]?.trim() || '...'  // "..."
    // parts[2] would be empty or trailing text

    // Step 1: Generate narration TTS (known voice)
    const knownVoiceId = voiceConfig.known
    const narrationPath = path.join(tempDir, 'narration.mp3')

    // Generate narration (the full text minus voice tags)
    const narrationText = text
      .replace(/\{target1\}/g, '')
      .replace(/\{target2\}/g, '')
      .trim()

    const { audioBuffer: narrationBuffer } = await generateSingleAudio(
      narrationText,
      need.lang,
      'known',
      knownVoiceId,
      'natural'
    )
    await fs.writeFile(narrationPath, narrationBuffer)
    logger.log(`  Generated narration for ${need.legoId}`)

    // Step 2: Generate or fetch target1 clip
    const target1VoiceId = voiceConfig.target1
    const target1Cadence = 'slow'
    const target1Uuid = db.generateAudioUUID(target1VoiceId, targetWord, need.targetLang, 'target1', target1Cadence)

    let target1Path = path.join(tempDir, 'target1.mp3')

    // Check if target1 exists in database/S3 - if so, download via signed URL
    const target1Exists = await db.audioExists(target1Uuid)
    if (target1Exists && s3Service) {
      try {
        const signedUrl = await s3Service.getAudioSignedUrl(target1Uuid)
        const fetch = require('node-fetch')
        const response = await fetch(signedUrl)
        const buffer = await response.buffer()
        await fs.writeFile(target1Path, buffer)
        logger.log(`  Downloaded existing target1 for ${need.legoId}`)
      } catch (downloadErr) {
        logger.warn(`  Failed to download target1, generating fresh: ${downloadErr.message}`)
        const { audioBuffer: target1Buffer } = await generateSingleAudio(
          targetWord, need.targetLang, 'target1', target1VoiceId, target1Cadence
        )
        await fs.writeFile(target1Path, target1Buffer)
      }
    } else {
      // Generate fresh
      const { audioBuffer: target1Buffer } = await generateSingleAudio(
        targetWord,
        need.targetLang,
        'target1',
        target1VoiceId,
        target1Cadence
      )
      await fs.writeFile(target1Path, target1Buffer)
      logger.log(`  Generated target1 for ${need.legoId}`)
    }

    // Step 3: Generate or fetch target2 clip
    const target2VoiceId = voiceConfig.target2
    const target2Cadence = 'slow'
    const target2Uuid = db.generateAudioUUID(target2VoiceId, targetWord, need.targetLang, 'target2', target2Cadence)

    let target2Path = path.join(tempDir, 'target2.mp3')

    const target2Exists = await db.audioExists(target2Uuid)
    if (target2Exists && s3Service) {
      try {
        const signedUrl = await s3Service.getAudioSignedUrl(target2Uuid)
        const fetch = require('node-fetch')
        const response = await fetch(signedUrl)
        const buffer = await response.buffer()
        await fs.writeFile(target2Path, buffer)
        logger.log(`  Downloaded existing target2 for ${need.legoId}`)
      } catch (downloadErr) {
        logger.warn(`  Failed to download target2, generating fresh: ${downloadErr.message}`)
        const { audioBuffer: target2Buffer } = await generateSingleAudio(
          targetWord, need.targetLang, 'target2', target2VoiceId, target2Cadence
        )
        await fs.writeFile(target2Path, target2Buffer)
      }
    } else {
      const { audioBuffer: target2Buffer } = await generateSingleAudio(
        targetWord,
        need.targetLang,
        'target2',
        target2VoiceId,
        target2Cadence
      )
      await fs.writeFile(target2Path, target2Buffer)
      logger.log(`  Generated target2 for ${need.legoId}`)
    }

    // Step 4: Concatenate all parts with pauses
    // Order: narration (includes "... X ... X" spoken)
    // Actually, for consolidated we want: narration_part1 + target1 + narration_part2 + target2
    // But our narration already includes the pauses as "..."
    // So we generate: narration (full) which naturally has pauses, then append targets?
    //
    // Actually let's keep it simple: the narration says everything including "... [word] ... [word]"
    // But we want the ACTUAL target voices for the [word] parts
    //
    // Best approach: Generate narration for just the explanation part, then stitch
    // "The Spanish for 'I want', as in 'I want to go', is:" + pause + target1 + pause + target2

    // Let's regenerate narration as just the intro part (without the "... X ... X")
    const introNarration = narrationPart1.replace(/\.\.\.\s*$/, '').trim()  // Remove trailing "..."
    const introNarrationPath = path.join(tempDir, 'intro_narration.mp3')

    const { audioBuffer: introBuffer } = await generateSingleAudio(
      introNarration,
      need.lang,
      'known',
      knownVoiceId,
      'natural'
    )
    await fs.writeFile(introNarrationPath, introBuffer)

    // Step 5: Concatenate: intro_narration + pause + target1 + pause + target2
    const outputPath = path.join(tempDir, 'consolidated.mp3')

    await audioProcessor.concatenateAudio(
      [introNarrationPath, target1Path, target2Path],
      outputPath,
      {
        pauseBetween: 600,  // 600ms pause between segments
        normalize: true
      }
    )

    // Read the final consolidated audio
    const consolidatedBuffer = await fs.readFile(outputPath)

    // Generate UUID for the consolidated introduction
    // Use a deterministic hash based on the full introduction text
    const introUuid = db.generateAudioUUID(
      knownVoiceId,  // Primary voice
      need.text,     // Full introduction text for uniqueness
      need.lang,
      'introduction',
      'natural'
    )

    logger.log(`  Consolidated introduction for ${need.legoId}: ${introUuid}`)

    return {
      audioBuffer: consolidatedBuffer,
      uuid: introUuid,
      target1Uuid,
      target2Uuid
    }

  } finally {
    // Cleanup temp directory
    await fs.remove(tempDir).catch(() => {})
  }
}

/**
 * Extract unique audio needs from lego_baskets.json
 * Returns array of { text, lang, role, seedId, legoId }
 *
 * @param {Object} baskets - The lego_baskets.json content
 * @param {string} targetLang - Target language code
 * @param {string} knownLang - Known language code
 * @returns {Array}
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
          const key1 = `${cycle.target}|${targetLang}|target1`
          if (!seen.has(key1)) {
            seen.add(key1)
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

        // Known language text
        if (cycle.source) {
          const key = `${cycle.source}|${knownLang}|known`
          if (!seen.has(key)) {
            seen.add(key)
            needs.push({
              text: cycle.source,
              lang: knownLang,
              role: 'known',
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
 * Target roles use slow cadence for learner clarity
 * Known/presentation roles use natural cadence
 *
 * @param {string} role
 * @returns {string}
 */
function getCadenceForRole(role) {
  if (role === 'known' || role === 'presentation') return 'natural'
  return 'slow'
}

/**
 * Generate audio for a single sample using TTS
 *
 * @param {string} text
 * @param {string} lang
 * @param {string} role
 * @param {string} voiceId
 * @param {string} cadence
 * @returns {Promise<{audioBuffer: Buffer, ttsEngine: string}>}
 */
async function generateSingleAudio(text, lang, role, voiceId, cadence) {
  const voice = await db.getVoice(voiceId)

  if (!voice) {
    throw new Error(`Voice not found: ${voiceId}`)
  }

  let audioBuffer
  let ttsEngine = voice.tts_engine

  if (voice.type === 'tts' && voice.tts_engine === 'azure') {
    if (!azureTTS) throw new Error('Azure TTS service not available')

    // Azure TTS synthesize
    const rate = cadence === 'slow' ? 0.8 : 1.0
    audioBuffer = await azureTTS.synthesize(text, voiceId, { rate })

  } else if (voice.type === 'tts' && voice.tts_engine === 'elevenlabs') {
    if (!elevenLabsTTS) throw new Error('ElevenLabs service not available')

    // ElevenLabs synthesize
    audioBuffer = await elevenLabsTTS.synthesize(text, voiceId, { stability: 0.5 })

  } else if (voice.type === 'human') {
    throw new Error(`Cannot generate TTS for human voice: ${voiceId}`)

  } else {
    throw new Error(`Unsupported voice type: ${voice.type}`)
  }

  return { audioBuffer, ttsEngine }
}

/**
 * POST /generate
 *
 * Start audio generation for a course
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
  const { courseCode, voices, dryRun = false } = req.body

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
    dryRun,
    progress: { current: 0, total: 0, skipped: 0, generated: 0, failed: 0 }
  }
  activeJobs.set(courseCode, job)

  // Return immediately, process in background
  res.json({ success: true, jobId, message: dryRun ? 'Dry run started' : 'Generation started' })

  // Background processing
  try {
    const dataSource = 'supabase'
    job.dataSource = dataSource

    // Parse course code for languages (e.g., spa_for_eng)
    const parts = courseCode.split('_')
    let targetLang, knownLang

    if (parts.length === 3 && parts[1] === 'for') {
      // Standard format: spa_for_eng
      targetLang = parts[0]
      knownLang = parts[2]
    } else {
      // Fallback
      targetLang = parts[0] || 'spa'
      knownLang = parts[parts.length - 1] || 'eng'
    }

    // DATABASE-FIRST: Extract all audio needs directly from Supabase
    // 1. Practice phrase audio (target1, target2, known for each phrase)
    const phraseNeeds = await extractPhraseAudioNeedsFromSupabase(courseCode, targetLang, knownLang)
    logger.log(`${courseCode}: ${phraseNeeds.length} audio samples from practice phrases (database)`)

    // 2. Introduction audio (consolidated intro for each new LEGO)
    const introNeeds = await extractIntroductionAudioNeedsFromSupabase(courseCode, targetLang, knownLang)
    logger.log(`${courseCode}: ${introNeeds.length} audio samples from introductions`)

    // Combine all needs (deduplicate by key)
    const allNeeds = [...phraseNeeds]
    const seenKeys = new Set(phraseNeeds.map(n => `${n.text}|${n.lang}|${n.role}`))

    for (const need of introNeeds) {
      const key = `${need.text}|${need.lang}|${need.role}`
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        allNeeds.push(need)
      }
    }

    const needs = allNeeds
    job.progress.total = needs.length

    logger.log(`${courseCode}: ${needs.length} total unique audio samples needed`)

    // Get voice config
    const voiceConfig = voices || await db.getCourseVoices(courseCode) || {}

    // Validate voices
    if (!voiceConfig.known || !voiceConfig.target1 || !voiceConfig.target2) {
      job.status = 'failed'
      job.error = 'Missing voice configuration. Required: known, target1, target2'
      return
    }

    // Process each need
    for (let i = 0; i < needs.length; i++) {
      const need = needs[i]

      // Special handling for consolidated introductions
      if (need.type === 'consolidated_introduction') {
        // Generate UUID for the consolidated introduction
        const introUuid = db.generateAudioUUID(
          voiceConfig.known,
          need.text,
          need.lang,
          'introduction',
          'natural'
        )

        // Check if exists
        const exists = await db.audioExists(introUuid)
        if (exists) {
          job.progress.skipped++
          job.progress.current = i + 1
          await db.recordCourseUsage(courseCode, introUuid, 'introduction', need.seedId, need.legoId)
          continue
        }

        // Dry run mode
        if (dryRun) {
          job.progress.generated++
          job.progress.current = i + 1
          continue
        }

        // Generate consolidated introduction audio
        try {
          logger.log(`Generating consolidated introduction for ${need.legoId}...`)
          const result = await generateConsolidatedIntroduction(need, voiceConfig, courseCode)

          // Upload to S3
          let s3Key = `mastered/${result.uuid}.mp3`
          let s3Bucket = process.env.S3_BUCKET || 'ssi-audio-stage'

          if (s3Service) {
            const s3Result = await s3Service.uploadAudio(result.uuid, result.audioBuffer)
            s3Key = s3Result.key
            s3Bucket = s3Result.bucket
          }

          // Extract duration
          let durationMs = null
          try {
            const tempFile = path.join(os.tmpdir(), `${result.uuid}-temp.mp3`)
            await fs.writeFile(tempFile, result.audioBuffer)
            const durationSec = await audioProcessor.getAudioDuration(tempFile)
            durationMs = Math.round(durationSec * 1000)
            await fs.remove(tempFile)
          } catch (e) {
            logger.warn(`Failed to extract duration for introduction ${result.uuid}`)
          }

          // Insert into Supabase
          const checksum = crypto.createHash('md5').update(result.audioBuffer).digest('hex')
          await db.insertAudioSample({
            uuid: result.uuid,
            voiceId: voiceConfig.known,
            text: need.text,
            lang: need.lang,
            role: 'introduction',
            cadence: 'natural',
            s3Bucket,
            s3Key,
            durationMs,
            fileSizeBytes: result.audioBuffer.length,
            checksumMd5: checksum,
            source: 'consolidated_tts',
            ttsEngine: 'consolidated',
            ttsVoiceVariant: `${voiceConfig.known}+${voiceConfig.target1}+${voiceConfig.target2}`,
            hashInput: `introduction:${need.legoId}`
          })

          // Record course usage
          await db.recordCourseUsage(courseCode, result.uuid, 'introduction', need.seedId, need.legoId)

          job.progress.generated++
          logger.log(`Generated consolidated introduction ${i + 1}/${needs.length}: ${result.uuid}`)

        } catch (err) {
          logger.error(`Failed to generate introduction for ${need.legoId}:`, err.message)
          job.progress.failed++
        }

        job.progress.current = i + 1
        emitProgress(courseCode, job.progress)
        continue
      }

      // Standard audio generation for non-introduction needs
      // 'presentation' role uses the 'known' voice (for introduction narration)
      const voiceRole = need.role === 'presentation' ? 'known' : need.role
      const voiceId = voiceConfig[voiceRole]

      if (!voiceId) {
        logger.warn(`No voice configured for role: ${need.role} (looked up as ${voiceRole})`)
        job.progress.failed++
        continue
      }

      const cadence = getCadenceForRole(need.role)
      const uuid = db.generateAudioUUID(voiceId, need.text, need.lang, need.role, cadence)
      const hashInput = db.getHashInput(voiceId, need.text, need.lang, need.role, cadence)

      // Check if exists
      const exists = await db.audioExists(uuid)
      if (exists) {
        job.progress.skipped++
        job.progress.current = i + 1

        // Still record usage (upsert is safe)
        await db.recordCourseUsage(courseCode, uuid, 'basket', need.seedId, need.legoId)
        continue
      }

      // Dry run mode - just count what would be generated
      if (dryRun) {
        job.progress.generated++
        job.progress.current = i + 1
        continue
      }

      // Generate audio
      try {
        const { audioBuffer, ttsEngine } = await generateSingleAudio(
          need.text, need.lang, need.role, voiceId, cadence
        )

        // Calculate metadata
        const checksum = crypto.createHash('md5').update(audioBuffer).digest('hex')
        let s3Key = `mastered/${uuid}.mp3`
        let s3Bucket = process.env.S3_BUCKET || 'ssi-audio-stage' // default

        // Upload to S3
        if (s3Service) {
          const s3Result = await s3Service.uploadAudio(uuid, audioBuffer)
          s3Key = s3Result.key
          s3Bucket = s3Result.bucket
        } else {
          logger.warn(`S3 service not available, skipping upload for ${uuid}`)
        }

        // Extract audio duration
        let durationMs = null
        try {
          // Write buffer to temporary file for duration extraction
          const tempFile = path.join(os.tmpdir(), `${uuid}-temp.mp3`)
          await fs.writeFile(tempFile, audioBuffer)

          // Get duration in seconds using sox
          const durationSec = await audioProcessor.getAudioDuration(tempFile)
          durationMs = Math.round(durationSec * 1000) // Convert to milliseconds

          // Cleanup temp file
          await fs.remove(tempFile)

          logger.log(`Extracted duration for ${uuid}: ${durationMs}ms`)
        } catch (durationErr) {
          logger.warn(`Failed to extract duration for ${uuid}: ${durationErr.message}`)
          // Continue without duration - not critical
        }

        // Insert into Supabase
        await db.insertAudioSample({
          uuid,
          voiceId,
          text: need.text,
          lang: need.lang,
          role: need.role,
          cadence,
          s3Bucket,
          s3Key,
          durationMs,
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
        logger.log(`Generated ${i + 1}/${needs.length}: ${uuid}`)

      } catch (err) {
        logger.error(`Failed to generate ${uuid}:`, err.message)
        job.progress.failed++
      }

      job.progress.current = i + 1

      // Emit progress (if production API is running)
      emitProgress(courseCode, job.progress)
    }

    job.status = 'complete'
    job.completedAt = new Date().toISOString()

    logger.log(`${courseCode} complete:`, job.progress)

    // Emit generation_complete event
    emitGenerationComplete(courseCode, job.progress)

  } catch (err) {
    job.status = 'failed'
    job.error = err.message
    logger.error(`${courseCode} failed:`, err)
  }
})

/**
 * POST /plan
 *
 * Show what would be generated without actually generating
 * Returns counts and sample of what needs generation
 */
app.post('/plan', async (req, res) => {
  const { courseCode, voices } = req.body

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' })
  }

  try {
    // Parse course code
    const parts = courseCode.split('_')
    const targetLang = parts[0]
    const knownLang = parts[parts.length - 1]

    // DATABASE-FIRST: Extract all audio needs directly from Supabase
    // 1. Practice phrase audio (target1, target2, known for each phrase)
    const phraseNeeds = await extractPhraseAudioNeedsFromSupabase(courseCode, targetLang, knownLang)

    // 2. Introduction audio (consolidated intro for each new LEGO)
    const introNeeds = await extractIntroductionAudioNeedsFromSupabase(courseCode, targetLang, knownLang)

    // Combine all needs (deduplicate)
    const allNeeds = [...phraseNeeds]
    const seenKeys = new Set(phraseNeeds.map(n => `${n.text}|${n.lang}|${n.role}`))

    for (const need of introNeeds) {
      const key = `${need.text}|${need.lang}|${need.role}`
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        allNeeds.push(need)
      }
    }

    const needs = allNeeds
    const dataSource = 'supabase'

    // Get voice config
    const voiceConfig = voices || await db.getCourseVoices(courseCode) || {}

    // TEXT-FIRST LOOKUP: Check which texts already have audio in the database
    // This is the v12 approach - look up by text content, not deterministic UUIDs
    const supabase = db.getClient()

    // Collect unique texts by role
    const textsByRole = {
      known: new Set(),
      target1: new Set(),
      target2: new Set(),
      introduction: new Set()
    }

    for (const need of needs) {
      if (need.text && textsByRole[need.role]) {
        textsByRole[need.role].add(need.text)
      }
    }

    // Query existing audio for this course from course_audio joined with texts
    logger.log(`Checking existing audio for ${courseCode} by text lookup...`)

    const { data: existingAudio, error: audioError } = await supabase
      .from('course_audio')
      .select(`
        role,
        audio_files!inner (
          id,
          texts!inner (
            content
          )
        )
      `)
      .eq('course_code', courseCode)

    if (audioError) {
      logger.warn(`Error checking existing audio: ${audioError.message}`)
    }

    // Build lookup: role -> Set of texts that have audio
    const existingByRole = {
      known: new Set(),
      target1: new Set(),
      target2: new Set(),
      introduction: new Set()
    }

    for (const ca of existingAudio || []) {
      const text = ca.audio_files?.texts?.content
      const role = ca.role
      if (text && existingByRole[role]) {
        existingByRole[role].add(text)
      }
    }

    // Count existing vs needed
    let existing = 0
    let toGenerate = 0
    const samples = []

    for (const need of needs) {
      const hasAudio = existingByRole[need.role]?.has(need.text)
      if (hasAudio) {
        existing++
      } else {
        toGenerate++
        if (samples.length < 10) {
          samples.push({
            text: need.text,
            lang: need.lang,
            role: need.role
          })
        }
      }
    }

    logger.log(`Found ${existing} existing, ${toGenerate} to generate`)

    // Calculate counts
    const results = {
      total: needs.length,
      phraseNeeds: phraseNeeds.length,
      introNeeds: introNeeds.length,
      existing,
      toGenerate,
      missingVoice: 0,
      samples
    }

    res.json({
      success: true,
      courseCode,
      dataSource,
      plan: results,
      voices: voiceConfig
    })

  } catch (err) {
    logger.error('Plan error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /status/:courseCode
 *
 * Get status of active or completed job
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
 * DELETE /cancel/:courseCode
 *
 * Cancel an active job (marks it for cancellation)
 */
app.delete('/cancel/:courseCode', (req, res) => {
  const { courseCode } = req.params
  const job = activeJobs.get(courseCode)

  if (!job) {
    return res.status(404).json({ error: 'No job found' })
  }

  if (job.status !== 'running') {
    return res.status(400).json({ error: 'Job is not running' })
  }

  job.status = 'cancelled'
  job.cancelledAt = new Date().toISOString()

  res.json({ success: true, message: 'Job marked for cancellation' })
})

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Phase 8 Audio Generator',
    port: PORT,
    timestamp: new Date().toISOString(),
    supabase: db.isInitialized() ? 'connected' : 'not configured',
    azureTts: azureTTS ? 'available' : 'not available',
    elevenLabs: elevenLabsTTS ? 'available' : 'not available',
    s3: s3Service ? 'available' : 'not available'
  })
})

/**
 * Emit progress to Production API WebSocket
 *
 * @param {string} courseCode
 * @param {Object} progress
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

/**
 * Emit generation complete event to Production API WebSocket
 *
 * @param {string} courseCode
 * @param {Object} progress - Final progress stats
 */
async function emitGenerationComplete(courseCode, progress) {
  const productionApiUrl = process.env.PRODUCTION_API_URL || 'http://localhost:3470'

  try {
    const fetch = require('node-fetch')
    await fetch(`${productionApiUrl}/api/production/internal/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseCode,
        event: 'generation_complete',
        data: {
          phase: 'audio_generation',
          completedAt: new Date().toISOString(),
          total: progress.total,
          generated: progress.generated,
          skipped: progress.skipped,
          failed: progress.failed,
          percentage: 100
        }
      })
    })
  } catch (e) {
    // Ignore - production API might not be running
  }
}

// Start server
app.listen(PORT, () => {
  logger.log(`Audio Generator running on port ${PORT}`)
  logger.log(`Supabase: ${db.isInitialized() ? 'connected' : 'not configured'}`)
})

module.exports = { app, extractAudioNeeds, getCadenceForRole }
