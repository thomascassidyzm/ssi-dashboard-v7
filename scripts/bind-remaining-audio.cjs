const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function bindDuplicates() {
  console.log('=== BINDING PHRASES TO EXISTING AUDIO ===\n')

  const courses = ['jpn_for_eng', 'deu_for_eng', 'zho_for_eng']

  for (const code of courses) {
    // Find phrases still missing audio
    const { data: noKnown } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, position, known_text')
      .eq('course_code', code)
      .is('known_audio_id', null)

    for (const p of noKnown || []) {
      const { data: audio } = await supabase
        .from('course_audio')
        .select('id')
        .eq('course_code', code)
        .eq('role', 'known')
        .eq('text_normalized', p.known_text.toLowerCase().trim())
        .limit(1)

      if (audio && audio.length) {
        const { error } = await supabase
          .from('course_practice_phrases')
          .update({ known_audio_id: audio[0].id })
          .eq('id', p.id)

        if (!error) {
          console.log('Bound ' + code + ' known: "' + p.known_text + '"')
        }
      }
    }

    // Find phrases missing target1
    const { data: noTarget1 } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, position, target_text')
      .eq('course_code', code)
      .is('target1_audio_id', null)

    for (const p of noTarget1 || []) {
      const { data: audio } = await supabase
        .from('course_audio')
        .select('id')
        .eq('course_code', code)
        .eq('role', 'target1')
        .eq('text_normalized', p.target_text.toLowerCase().trim())
        .limit(1)

      if (audio && audio.length) {
        const { error } = await supabase
          .from('course_practice_phrases')
          .update({ target1_audio_id: audio[0].id })
          .eq('id', p.id)

        if (!error) {
          console.log('Bound ' + code + ' target1: "' + p.target_text + '"')
        }
      }
    }

    // Find phrases missing target2
    const { data: noTarget2 } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, position, target_text')
      .eq('course_code', code)
      .is('target2_audio_id', null)

    for (const p of noTarget2 || []) {
      const { data: audio } = await supabase
        .from('course_audio')
        .select('id')
        .eq('course_code', code)
        .eq('role', 'target2')
        .eq('text_normalized', p.target_text.toLowerCase().trim())
        .limit(1)

      if (audio && audio.length) {
        const { error } = await supabase
          .from('course_practice_phrases')
          .update({ target2_audio_id: audio[0].id })
          .eq('id', p.id)

        if (!error) {
          console.log('Bound ' + code + ' target2: "' + p.target_text + '"')
        }
      }
    }
  }

  console.log('\nDone!')
}
bindDuplicates()
