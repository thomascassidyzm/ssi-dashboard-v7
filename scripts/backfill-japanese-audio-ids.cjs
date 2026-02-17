/**
 * Backfill audio IDs for Chinese course
 *
 * Binds known_audio_id, target1_audio_id, target2_audio_id on:
 * - course_legos
 * - course_practice_phrases
 *
 * Matches by normalized text and role in course_audio table
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const COURSE_CODE = 'jpn_for_eng'

// Normalize text for matching
function normalizeText(text) {
  if (!text) return ''
  return text.toLowerCase().trim()
}

async function buildAudioLookup() {
  console.log('Building audio lookup maps...')

  // Build lookup maps by role: text_normalized -> audio_id
  const knownMap = new Map()  // role = 'known'
  const target1Map = new Map() // role = 'target1'
  const target2Map = new Map() // role = 'target2'

  // Fetch all audio for this course with pagination
  let offset = 0
  const batchSize = 10000
  let totalLoaded = 0

  while (true) {
    const { data: audioRecords, error } = await supabase
      .from('course_audio')
      .select('id, text_normalized, role')
      .eq('course_code', COURSE_CODE)
      .range(offset, offset + batchSize - 1)

    if (error) throw new Error(`Failed to fetch audio: ${error.message}`)
    if (!audioRecords || audioRecords.length === 0) break

    totalLoaded += audioRecords.length
    process.stdout.write(`\r  Loading audio records... ${totalLoaded}`)

    for (const audio of audioRecords) {
      const key = audio.text_normalized
      if (!key) continue

      if (audio.role === 'known') {
        knownMap.set(key, audio.id)
      } else if (audio.role === 'target1') {
        target1Map.set(key, audio.id)
      } else if (audio.role === 'target2') {
        target2Map.set(key, audio.id)
      }
    }

    offset += batchSize
    if (audioRecords.length < batchSize) break
  }

  console.log(`\n  Loaded ${totalLoaded} audio records`)
  console.log(`  known: ${knownMap.size}, target1: ${target1Map.size}, target2: ${target2Map.size}`)

  return { knownMap, target1Map, target2Map }
}

async function backfillLegos(lookup) {
  console.log('\n=== BACKFILLING course_legos ===')

  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
    .eq('course_code', COURSE_CODE)
    .eq('is_new', true)

  if (error) throw new Error(`Failed to fetch LEGOs: ${error.message}`)

  console.log(`Found ${legos.length} LEGOs to process`)

  let updated = 0
  let alreadyBound = 0
  let notFound = { known: 0, target1: 0, target2: 0 }

  for (const lego of legos) {
    const knownNorm = normalizeText(lego.known_text)
    const targetNorm = normalizeText(lego.target_text)

    const knownAudioId = lookup.knownMap.get(knownNorm)
    const target1AudioId = lookup.target1Map.get(targetNorm)
    const target2AudioId = lookup.target2Map.get(targetNorm)

    // Check if already bound
    if (lego.known_audio_id && lego.target1_audio_id && lego.target2_audio_id) {
      alreadyBound++
      continue
    }

    // Track what's not found
    if (!knownAudioId) notFound.known++
    if (!target1AudioId) notFound.target1++
    if (!target2AudioId) notFound.target2++

    // Only update if we found at least one
    const updates = {}
    if (knownAudioId && !lego.known_audio_id) updates.known_audio_id = knownAudioId
    if (target1AudioId && !lego.target1_audio_id) updates.target1_audio_id = target1AudioId
    if (target2AudioId && !lego.target2_audio_id) updates.target2_audio_id = target2AudioId

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('course_legos')
        .update(updates)
        .eq('id', lego.id)

      if (!updateError) updated++
    }
  }

  console.log(`  Updated: ${updated}`)
  console.log(`  Already bound: ${alreadyBound}`)
  console.log(`  Not found - known: ${notFound.known}, target1: ${notFound.target1}, target2: ${notFound.target2}`)
}

async function backfillPhrases(lookup) {
  console.log('\n=== BACKFILLING course_practice_phrases ===')

  // Fetch in batches to avoid memory issues
  let offset = 0
  const batchSize = 1000
  let totalUpdated = 0
  let totalAlreadyBound = 0
  let totalNotFound = { known: 0, target1: 0, target2: 0 }
  let totalProcessed = 0

  while (true) {
    const { data: phrases, error } = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', COURSE_CODE)
      .range(offset, offset + batchSize - 1)

    if (error) throw new Error(`Failed to fetch phrases: ${error.message}`)
    if (!phrases || phrases.length === 0) break

    totalProcessed += phrases.length
    process.stdout.write(`\r  Processing ${totalProcessed} phrases...`)

    for (const phrase of phrases) {
      const knownNorm = normalizeText(phrase.known_text)
      const targetNorm = normalizeText(phrase.target_text)

      const knownAudioId = lookup.knownMap.get(knownNorm)
      const target1AudioId = lookup.target1Map.get(targetNorm)
      const target2AudioId = lookup.target2Map.get(targetNorm)

      // Check if already bound
      if (phrase.known_audio_id && phrase.target1_audio_id && phrase.target2_audio_id) {
        totalAlreadyBound++
        continue
      }

      // Track what's not found
      if (!knownAudioId) totalNotFound.known++
      if (!target1AudioId) totalNotFound.target1++
      if (!target2AudioId) totalNotFound.target2++

      // Only update if we found at least one
      const updates = {}
      if (knownAudioId && !phrase.known_audio_id) updates.known_audio_id = knownAudioId
      if (target1AudioId && !phrase.target1_audio_id) updates.target1_audio_id = target1AudioId
      if (target2AudioId && !phrase.target2_audio_id) updates.target2_audio_id = target2AudioId

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('course_practice_phrases')
          .update(updates)
          .eq('id', phrase.id)

        if (!updateError) totalUpdated++
      }
    }

    offset += batchSize
    if (phrases.length < batchSize) break
  }

  console.log(`\n  Total processed: ${totalProcessed}`)
  console.log(`  Updated: ${totalUpdated}`)
  console.log(`  Already bound: ${totalAlreadyBound}`)
  console.log(`  Not found - known: ${totalNotFound.known}, target1: ${totalNotFound.target1}, target2: ${totalNotFound.target2}`)
}

async function verifyCoverage() {
  console.log('\n=== VERIFICATION ===')

  const { count: legosTotal } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE)
    .eq('is_new', true)

  const { count: legosWithKnown } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE)
    .eq('is_new', true)
    .not('known_audio_id', 'is', null)

  const { count: legosWithTarget1 } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE)
    .eq('is_new', true)
    .not('target1_audio_id', 'is', null)

  console.log('course_legos:')
  console.log(`  known_audio_id: ${legosWithKnown}/${legosTotal} (${Math.round(legosWithKnown/legosTotal*100)}%)`)
  console.log(`  target1_audio_id: ${legosWithTarget1}/${legosTotal} (${Math.round(legosWithTarget1/legosTotal*100)}%)`)

  const { count: phrasesTotal } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE)

  const { count: phrasesWithKnown } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE)
    .not('known_audio_id', 'is', null)

  const { count: phrasesWithTarget1 } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE)
    .not('target1_audio_id', 'is', null)

  console.log('course_practice_phrases:')
  console.log(`  known_audio_id: ${phrasesWithKnown}/${phrasesTotal} (${Math.round(phrasesWithKnown/phrasesTotal*100)}%)`)
  console.log(`  target1_audio_id: ${phrasesWithTarget1}/${phrasesTotal} (${Math.round(phrasesWithTarget1/phrasesTotal*100)}%)`)
}

async function main() {
  console.log(`=== BACKFILLING AUDIO IDs FOR ${COURSE_CODE} ===\n`)

  const lookup = await buildAudioLookup()
  await backfillLegos(lookup)
  await backfillPhrases(lookup)
  await verifyCoverage()

  console.log('\n=== DONE ===')
}

main().catch(console.error)
