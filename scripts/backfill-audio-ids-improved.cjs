/**
 * Improved backfill audio IDs - handles punctuation normalization
 *
 * Binds known_audio_id, target1_audio_id, target2_audio_id on:
 * - course_legos
 * - course_practice_phrases
 *
 * Key improvement: Strips punctuation for matching, not just lowercase/trim
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Get course code from command line or default
const COURSE_CODE = process.argv[2] || 'all'
const DRY_RUN = process.argv.includes('--dry-run')

// Improved normalization: strip punctuation for matching
function normalizeForMatching(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    // Remove common punctuation (keep apostrophes for now, strip at end)
    .replace(/[。、！？，．：；「」『』（）【】・…—–\-\.\!\?\,\:\;\"]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

async function buildAudioLookup(courseCode) {
  console.log(`Building audio lookup for ${courseCode}...`)

  // Maps: normalizedText -> { id, originalText }
  const knownMap = new Map()
  const target1Map = new Map()
  const target2Map = new Map()

  let offset = 0
  const batchSize = 10000
  let totalLoaded = 0

  while (true) {
    const { data: audioRecords, error } = await supabase
      .from('course_audio')
      .select('id, text, text_normalized, role')
      .eq('course_code', courseCode)
      .range(offset, offset + batchSize - 1)

    if (error) throw new Error(`Failed to fetch audio: ${error.message}`)
    if (!audioRecords || audioRecords.length === 0) break

    totalLoaded += audioRecords.length

    for (const audio of audioRecords) {
      // Use our improved normalization
      const key = normalizeForMatching(audio.text_normalized || audio.text)
      if (!key) continue

      const entry = { id: audio.id, originalText: audio.text }

      if (audio.role === 'known') {
        knownMap.set(key, entry)
      } else if (audio.role === 'target1') {
        target1Map.set(key, entry)
      } else if (audio.role === 'target2') {
        target2Map.set(key, entry)
      }
    }

    offset += batchSize
    if (audioRecords.length < batchSize) break
  }

  console.log(`  Loaded ${totalLoaded} audio records`)
  console.log(`  known: ${knownMap.size}, target1: ${target1Map.size}, target2: ${target2Map.size}`)

  return { knownMap, target1Map, target2Map }
}

async function backfillLegos(courseCode, lookup) {
  console.log(`\n=== BACKFILLING course_legos for ${courseCode} ===`)

  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
    .eq('course_code', courseCode)
    .eq('is_new', true)

  if (error) throw new Error(`Failed to fetch LEGOs: ${error.message}`)

  console.log(`Found ${legos.length} LEGOs to process`)

  let updated = 0
  let alreadyBound = 0
  let notFound = { known: 0, target1: 0, target2: 0 }
  let newlyBound = { known: 0, target1: 0, target2: 0 }

  for (const lego of legos) {
    const knownNorm = normalizeForMatching(lego.known_text)
    const targetNorm = normalizeForMatching(lego.target_text)

    const knownAudio = lookup.knownMap.get(knownNorm)
    const target1Audio = lookup.target1Map.get(targetNorm)
    const target2Audio = lookup.target2Map.get(targetNorm)

    // Check if already fully bound
    if (lego.known_audio_id && lego.target1_audio_id && lego.target2_audio_id) {
      alreadyBound++
      continue
    }

    // Track what's not found
    if (!knownAudio && !lego.known_audio_id) notFound.known++
    if (!target1Audio && !lego.target1_audio_id) notFound.target1++
    if (!target2Audio && !lego.target2_audio_id) notFound.target2++

    // Build updates
    const updates = {}
    if (knownAudio && !lego.known_audio_id) {
      updates.known_audio_id = knownAudio.id
      newlyBound.known++
    }
    if (target1Audio && !lego.target1_audio_id) {
      updates.target1_audio_id = target1Audio.id
      newlyBound.target1++
    }
    if (target2Audio && !lego.target2_audio_id) {
      updates.target2_audio_id = target2Audio.id
      newlyBound.target2++
    }

    if (Object.keys(updates).length > 0) {
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('course_legos')
          .update(updates)
          .eq('id', lego.id)

        if (!updateError) updated++
      } else {
        updated++
      }
    }
  }

  console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${updated}`)
  console.log(`  Already bound: ${alreadyBound}`)
  console.log(`  Newly bound - known: ${newlyBound.known}, target1: ${newlyBound.target1}, target2: ${newlyBound.target2}`)
  console.log(`  Still not found - known: ${notFound.known}, target1: ${notFound.target1}, target2: ${notFound.target2}`)

  return { updated, notFound }
}

async function backfillPhrases(courseCode, lookup) {
  console.log(`\n=== BACKFILLING course_practice_phrases for ${courseCode} ===`)

  let offset = 0
  const batchSize = 1000
  let totalUpdated = 0
  let totalAlreadyBound = 0
  let totalNotFound = { known: 0, target1: 0, target2: 0 }
  let totalNewlyBound = { known: 0, target1: 0, target2: 0 }
  let totalProcessed = 0

  while (true) {
    const { data: phrases, error } = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', courseCode)
      .range(offset, offset + batchSize - 1)

    if (error) throw new Error(`Failed to fetch phrases: ${error.message}`)
    if (!phrases || phrases.length === 0) break

    totalProcessed += phrases.length
    process.stdout.write(`\r  Processing ${totalProcessed} phrases...`)

    for (const phrase of phrases) {
      const knownNorm = normalizeForMatching(phrase.known_text)
      const targetNorm = normalizeForMatching(phrase.target_text)

      const knownAudio = lookup.knownMap.get(knownNorm)
      const target1Audio = lookup.target1Map.get(targetNorm)
      const target2Audio = lookup.target2Map.get(targetNorm)

      // Check if already fully bound
      if (phrase.known_audio_id && phrase.target1_audio_id && phrase.target2_audio_id) {
        totalAlreadyBound++
        continue
      }

      // Track what's not found
      if (!knownAudio && !phrase.known_audio_id) totalNotFound.known++
      if (!target1Audio && !phrase.target1_audio_id) totalNotFound.target1++
      if (!target2Audio && !phrase.target2_audio_id) totalNotFound.target2++

      // Build updates
      const updates = {}
      if (knownAudio && !phrase.known_audio_id) {
        updates.known_audio_id = knownAudio.id
        totalNewlyBound.known++
      }
      if (target1Audio && !phrase.target1_audio_id) {
        updates.target1_audio_id = target1Audio.id
        totalNewlyBound.target1++
      }
      if (target2Audio && !phrase.target2_audio_id) {
        updates.target2_audio_id = target2Audio.id
        totalNewlyBound.target2++
      }

      if (Object.keys(updates).length > 0) {
        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from('course_practice_phrases')
            .update(updates)
            .eq('id', phrase.id)

          if (!updateError) totalUpdated++
        } else {
          totalUpdated++
        }
      }
    }

    offset += batchSize
    if (phrases.length < batchSize) break
  }

  console.log(`\n  Total processed: ${totalProcessed}`)
  console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${totalUpdated}`)
  console.log(`  Already bound: ${totalAlreadyBound}`)
  console.log(`  Newly bound - known: ${totalNewlyBound.known}, target1: ${totalNewlyBound.target1}, target2: ${totalNewlyBound.target2}`)
  console.log(`  Still not found - known: ${totalNotFound.known}, target1: ${totalNotFound.target1}, target2: ${totalNotFound.target2}`)

  return { updated: totalUpdated, notFound: totalNotFound }
}

async function processCourse(courseCode) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`PROCESSING: ${courseCode}`)
  console.log('='.repeat(60))

  const lookup = await buildAudioLookup(courseCode)
  await backfillLegos(courseCode, lookup)
  await backfillPhrases(courseCode, lookup)
}

async function main() {
  console.log(`=== IMPROVED AUDIO ID BACKFILL ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`Course: ${COURSE_CODE}\n`)

  if (COURSE_CODE === 'all') {
    const courses = ['ara_for_eng', 'deu_for_eng', 'fra_for_eng', 'jpn_for_eng', 'spa_for_eng', 'zho_for_eng']
    for (const code of courses) {
      await processCourse(code)
    }
  } else {
    await processCourse(COURSE_CODE)
  }

  console.log('\n=== DONE ===')
}

main().catch(console.error)
