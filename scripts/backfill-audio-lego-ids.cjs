/**
 * Backfill lego_id on course_audio presentation records
 *
 * Matches presentation audio to LEGOs by parsing the text:
 * "The Chinese for 'hello', is:" → matches LEGO with known_text='hello'
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Courses to backfill (skip ara_for_eng which is already complete)
const courses = ['zho_for_eng', 'jpn_for_eng', 'fra_for_eng', 'deu_for_eng']

async function backfillCourse(courseCode) {
  console.log(`\n=== Backfilling ${courseCode} ===`)

  // Get all presentation audio without lego_id
  const { data: audioRecords, error: audioError } = await supabase
    .from('course_audio')
    .select('id, text_normalized')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .is('lego_id', null)

  if (audioError) {
    console.error(`Error fetching audio: ${audioError.message}`)
    return { updated: 0, failed: 0 }
  }

  console.log(`  Found ${audioRecords.length} audio records without lego_id`)

  if (audioRecords.length === 0) {
    return { updated: 0, failed: 0 }
  }

  // Get all LEGOs for this course
  const { data: legos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text')
    .eq('course_code', courseCode)
    .eq('is_new', true)

  if (legoError) {
    console.error(`Error fetching LEGOs: ${legoError.message}`)
    return { updated: 0, failed: 0 }
  }

  console.log(`  Found ${legos.length} LEGOs`)

  // Build lookup map: normalized known_text -> lego_id
  const legoByKnownText = new Map()
  for (const lego of legos) {
    const legoId = `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`
    const normalizedKnown = lego.known_text.toLowerCase().trim()
    legoByKnownText.set(normalizedKnown, legoId)
  }

  // Extract known_text from presentation text
  // Pattern: "the X for 'known_text', as in 'seed'" or "the X for 'known_text', is:"
  const extractKnownText = (text) => {
    // Try pattern: "for 'X', as in" or "for 'X', is:"
    const match = text.match(/for ['']([^'']+)[''],?\s*(as in|is:)/i)
    if (match) {
      return match[1].toLowerCase().trim()
    }
    return null
  }

  let updated = 0
  let failed = 0
  const notFound = []

  for (const audio of audioRecords) {
    const knownText = extractKnownText(audio.text_normalized || '')

    if (!knownText) {
      failed++
      continue
    }

    const legoId = legoByKnownText.get(knownText)

    if (!legoId) {
      failed++
      if (notFound.length < 5) {
        notFound.push({ text: audio.text_normalized?.substring(0, 60), extracted: knownText })
      }
      continue
    }

    // Update the audio record
    const { error: updateError } = await supabase
      .from('course_audio')
      .update({ lego_id: legoId })
      .eq('id', audio.id)

    if (updateError) {
      failed++
    } else {
      updated++
    }
  }

  console.log(`  Updated: ${updated}, Failed: ${failed}`)

  if (notFound.length > 0) {
    console.log('  Sample failures:')
    for (const nf of notFound) {
      console.log(`    "${nf.text}..." → extracted="${nf.extracted}"`)
    }
  }

  return { updated, failed }
}

async function bindPresentationAudioIds(courseCode) {
  console.log(`\n=== Binding presentation_audio_id for ${courseCode} ===`)

  // Get all LEGOs missing presentation_audio_id
  const { data: legos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .is('presentation_audio_id', null)

  if (legoError) {
    console.error(`Error: ${legoError.message}`)
    return 0
  }

  console.log(`  Found ${legos.length} LEGOs missing presentation_audio_id`)

  let bound = 0

  for (const lego of legos) {
    const legoId = `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`

    // Find presentation audio with this lego_id
    const { data: audio } = await supabase
      .from('course_audio')
      .select('id')
      .eq('course_code', courseCode)
      .eq('role', 'presentation')
      .eq('lego_id', legoId)
      .limit(1)
      .single()

    if (audio?.id) {
      const { error: updateError } = await supabase
        .from('course_legos')
        .update({ presentation_audio_id: audio.id })
        .eq('course_code', courseCode)
        .eq('seed_number', lego.seed_number)
        .eq('lego_index', lego.lego_index)

      if (!updateError) {
        bound++
      }
    }
  }

  console.log(`  Bound: ${bound}`)
  return bound
}

async function main() {
  console.log('Backfilling lego_id and binding presentation_audio_id...')

  for (const courseCode of courses) {
    // Step 1: Backfill lego_id on audio records
    await backfillCourse(courseCode)

    // Step 2: Bind presentation_audio_id on LEGOs
    await bindPresentationAudioIds(courseCode)
  }

  console.log('\n=== DONE ===')
  console.log('Run check-all-presentation-audio.cjs to verify coverage.')
}

main().catch(console.error)
