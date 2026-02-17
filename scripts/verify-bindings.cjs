const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function verifyBindings() {
  console.log('=== VERIFYING PRESENTATION AUDIO BINDINGS ===\n')

  const courses = ['zho_for_eng', 'jpn_for_eng', 'fra_for_eng', 'deu_for_eng', 'ara_for_eng']

  for (const course of courses) {
    // Get all LEGOs with presentation_audio_id
    const { data: legos } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, presentation_audio_id')
      .eq('course_code', course)
      .eq('is_new', true)
      .not('presentation_audio_id', 'is', null)

    if (!legos || legos.length === 0) {
      console.log(`${course}: No LEGOs with presentation_audio_id`)
      continue
    }

    // Get all referenced audio IDs - batch to avoid URL length limits
    const audioIds = legos.map(l => l.presentation_audio_id)
    const audioMap = new Map()

    // Batch in chunks of 100
    for (let i = 0; i < audioIds.length; i += 100) {
      const batch = audioIds.slice(i, i + 100)
      const { data: audioRecords } = await supabase
        .from('course_audio')
        .select('id, s3_key, lego_id')
        .in('id', batch)

      if (audioRecords) {
        for (const a of audioRecords) {
          audioMap.set(a.id, a)
        }
      }
    }

    let valid = 0
    let missingAudio = []
    let missingS3Key = []

    for (const lego of legos) {
      const legoId = `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`
      const audio = audioMap.get(lego.presentation_audio_id)

      if (!audio) {
        missingAudio.push(legoId)
      } else if (!audio.s3_key) {
        missingS3Key.push(legoId)
      } else {
        valid++
      }
    }

    const status = (missingAudio.length === 0 && missingS3Key.length === 0) ? '✓' : '⚠'
    console.log(`${status} ${course}: ${valid}/${legos.length} valid bindings`)

    if (missingAudio.length > 0) {
      console.log(`    Missing audio records: ${missingAudio.slice(0, 5).join(', ')}${missingAudio.length > 5 ? '...' : ''}`)
    }
    if (missingS3Key.length > 0) {
      console.log(`    Missing S3 key: ${missingS3Key.slice(0, 5).join(', ')}${missingS3Key.length > 5 ? '...' : ''}`)
    }
  }

  console.log('\n=== SAMPLE BINDINGS (spot check) ===\n')

  // Spot check a few from each course
  for (const course of courses) {
    const { data: samples } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, presentation_audio_id')
      .eq('course_code', course)
      .eq('is_new', true)
      .not('presentation_audio_id', 'is', null)
      .order('seed_number', { ascending: true })
      .limit(2)

    if (samples && samples.length > 0) {
      console.log(`${course}:`)
      for (const s of samples) {
        const legoId = `S${String(s.seed_number).padStart(4, '0')}L${String(s.lego_index).padStart(2, '0')}`

        // Get the audio text
        const { data: audio } = await supabase
          .from('course_audio')
          .select('text, s3_key')
          .eq('id', s.presentation_audio_id)
          .single()

        if (audio) {
          console.log(`  ${legoId} "${s.known_text}"`)
          console.log(`    → Audio: "${(audio.text || '').substring(0, 55)}..."`)
          console.log(`    → S3: ${audio.s3_key ? '✓ ' + audio.s3_key.substring(0, 40) : '✗ MISSING'}`)
        }
      }
      console.log()
    }
  }
}

verifyBindings().catch(console.error)
