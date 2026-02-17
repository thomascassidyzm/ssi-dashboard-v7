/**
 * Fix German presentation audio bindings
 *
 * Problem: Multiple audio records have the same lego_id due to old course versions
 * Solution: Match audio to LEGO by checking if audio text contains "for '{known_text}'"
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function fixGermanBindings() {
  console.log('=== FIXING GERMAN PRESENTATION BINDINGS ===\n')

  // Get all German LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, presentation_audio_id')
    .eq('course_code', 'deu_for_eng')
    .eq('is_new', true)
    .order('seed_number')
    .order('lego_index')

  console.log(`Processing ${legos.length} LEGOs...\n`)

  let fixed = 0
  let alreadyCorrect = 0
  let noMatch = []
  let multipleMatches = []

  for (const lego of legos) {
    const legoId = `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`
    const knownText = lego.known_text.toLowerCase()

    // Find audio that matches this LEGO's known_text
    // Pattern: "for 'known_text'," or "for 'known_text', is:"
    const { data: matchingAudio } = await supabase
      .from('course_audio')
      .select('id, text, lego_id')
      .eq('course_code', 'deu_for_eng')
      .eq('role', 'presentation')
      .ilike('text', `%for '${lego.known_text}',%`)

    if (!matchingAudio || matchingAudio.length === 0) {
      noMatch.push({ legoId, known: lego.known_text })
      continue
    }

    // If multiple matches, prefer the one that already has correct lego_id
    let correctAudio = matchingAudio.find(a => a.lego_id === legoId)
    if (!correctAudio) {
      // Otherwise just pick the first one
      correctAudio = matchingAudio[0]
    }

    if (matchingAudio.length > 1) {
      multipleMatches.push({ legoId, known: lego.known_text, count: matchingAudio.length })
    }

    // Check if already correctly bound
    if (lego.presentation_audio_id === correctAudio.id) {
      alreadyCorrect++
      continue
    }

    // Update LEGO to point to correct audio
    const { error: updateError } = await supabase
      .from('course_legos')
      .update({ presentation_audio_id: correctAudio.id })
      .eq('course_code', 'deu_for_eng')
      .eq('seed_number', lego.seed_number)
      .eq('lego_index', lego.lego_index)

    if (!updateError) {
      fixed++
    }

    // Update the audio record's lego_id to be correct
    if (correctAudio.lego_id !== legoId) {
      await supabase
        .from('course_audio')
        .update({ lego_id: legoId })
        .eq('id', correctAudio.id)
    }
  }

  console.log(`Results:`)
  console.log(`  Already correct: ${alreadyCorrect}`)
  console.log(`  Fixed: ${fixed}`)
  console.log(`  No matching audio: ${noMatch.length}`)
  console.log(`  Multiple matches (resolved): ${multipleMatches.length}`)

  if (noMatch.length > 0) {
    console.log(`\nLEGOs with no matching audio:`)
    for (const n of noMatch.slice(0, 10)) {
      console.log(`  ${n.legoId}: "${n.known}"`)
    }
    if (noMatch.length > 10) console.log(`  ... and ${noMatch.length - 10} more`)
  }

  // Now clear incorrect lego_ids from orphaned audio
  console.log(`\nClearing incorrect lego_ids from orphaned audio...`)

  // Get all presentation_audio_ids that are in use
  const { data: usedIds } = await supabase
    .from('course_legos')
    .select('presentation_audio_id')
    .eq('course_code', 'deu_for_eng')
    .eq('is_new', true)
    .not('presentation_audio_id', 'is', null)

  const usedSet = new Set(usedIds.map(l => l.presentation_audio_id))

  // Get all presentation audio with lego_id set
  const { data: allAudio } = await supabase
    .from('course_audio')
    .select('id, lego_id')
    .eq('course_code', 'deu_for_eng')
    .eq('role', 'presentation')
    .not('lego_id', 'is', null)

  // Find orphaned ones (have lego_id but are not used by any LEGO)
  const orphaned = allAudio.filter(a => !usedSet.has(a.id))

  console.log(`  Found ${orphaned.length} orphaned audio records`)

  // Clear their lego_ids
  if (orphaned.length > 0) {
    const orphanedIds = orphaned.map(a => a.id)

    // Batch in chunks of 100
    for (let i = 0; i < orphanedIds.length; i += 100) {
      const batch = orphanedIds.slice(i, i + 100)
      await supabase
        .from('course_audio')
        .update({ lego_id: null })
        .in('id', batch)
    }
    console.log(`  Cleared lego_id from ${orphaned.length} orphaned records`)
  }

  console.log(`\n=== DONE ===`)
}

fixGermanBindings().catch(console.error)
